// System Logger
const consoleEl = document.getElementById('console');
function log(msg, type = 'info') {
  const line = document.createElement('div');
  line.className = `console-log console-${type}`;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  consoleEl.appendChild(line);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}
function logSuccess(msg) { log(msg, 'success'); }
function logError(msg) { log(msg, 'error'); }
function logInfo(msg) { log(msg, 'info'); }

// ==========================================
// CBOR Parser (Adapted from webauthn-utils.js)
// ==========================================
class Cbor {
  constructor(buffer) {
    this.slice = new Uint8Array(buffer);
  }
  get data() { return this.slice; }
  get length() { return this.slice.length; }
  get empty() { return this.slice.length == 0; }
  get hex() { return uint8ArrayToHex(this.data); }

  compare(other) {
    if (this.length < other.length) return -1;
    if (this.length > other.length) return 1;
    for (let i = 0; i < this.length; i++) {
      if (this.slice[i] < other.slice[i]) return -1;
      if (this.slice[i] > other.slice[i]) return 1;
    }
    return 0;
  }

  getU8() {
    if (this.empty) throw "Cbor: empty during getU8";
    const byte = this.slice[0];
    this.slice = this.slice.subarray(1);
    return byte;
  }

  getBytes(n) {
    if (this.length < n) throw "Cbor: insufficient bytes in getBytes";
    const ret = this.slice.subarray(0, n);
    this.slice = this.slice.subarray(n);
    return ret;
  }

  getCBORHeader() {
    const copy = new Cbor(this.slice);
    const a = this.getU8();
    const majorType = a >> 5;
    const info = a & 31;
    if (info < 24) {
      return [majorType, info, new Cbor(copy.getBytes(1))];
    } else if (info < 28) {
      const lengthLength = 1 << (info - 24);
      let data = this.getBytes(lengthLength);
      let value = 0;
      for (let i = 0; i < lengthLength; i++) {
        if (value > 35184372088831) throw "Cbor: cannot represent CBOR number";
        value *= 256;
        value += data[i];
      }
      return [majorType, value, new Cbor(copy.getBytes(1 + lengthLength))];
    } else {
      throw "Cbor: CBOR contains unhandled info value " + info;
    }
  }

  getCBOR() {
    const [major, value] = this.getCBORHeader();
    switch (major) {
      case 0: return value;
      case 1: return 0 - (1 + value);
      case 2: return this.getBytes(value);
      case 3: return this.getBytes(value);
      case 4: {
        let ret = new Array(value);
        for (let i = 0; i < value; i++) {
          ret[i] = this.getCBOR();
        }
        return ret;
      }
      case 5: {
        if (value == 0) return {};
        let copy = new Cbor(this.data);
        const [firstKeyMajor] = copy.getCBORHeader();
        if (firstKeyMajor == 3) {
          // String-keyed map.
          let ret = {};
          for (let i = 0; i < value; i++) {
            const [keyMajor, keyLength] = this.getCBORHeader();
            if (keyMajor != 3) throw "Cbor: non-string in string-valued map";
            const keyBytes = new Cbor(this.getBytes(keyLength));
            ret[keyBytes.parseUTF8()] = this.getCBOR();
          }
          return ret;
        } else if (firstKeyMajor == 0 || firstKeyMajor == 1) {
          // Number-keyed map.
          let ret = {};
          for (let i = 0; i < value; i++) {
            let [keyMajor, keyValue] = this.getCBORHeader();
            if (keyMajor != 0 && keyMajor != 1) throw "Cbor: non-number in number-valued map";
            if (keyMajor == 1) {
              keyValue = 0 - (1 + keyValue);
            }
            ret[keyValue] = this.getCBOR();
          }
          return ret;
        } else {
          throw "Cbor: map keyed by invalid major type " + firstKeyMajor;
        }
      }
      default: throw "Cbor: unhandled major type " + major;
    }
  }

  parseUTF8() {
    return new TextDecoder("utf-8").decode(this.slice);
  }
}

function uint8ArrayToHex(arr) {
  return [...arr].map(b => b.toString(16).padStart(2, '0')).join('');
}

function parseCosePublicKey(coseKey) {
  let parsed = new Cbor(coseKey);
  let cbor = parsed.getCBOR();
  let key = {
    type: cbor[1],
    alg: cbor[3],
  };
  key.crv = cbor[-1];
  key.x = new Uint8Array(cbor[-2]);
  key.y = new Uint8Array(cbor[-3]);
  return key;
}

function parseAttestedCredentialData(attestedCredentialData) {
  let aaguid = attestedCredentialData.slice(0, 16);
  let credentialIdLength = (attestedCredentialData[16] << 8) + attestedCredentialData[17];
  let credentialId = attestedCredentialData.slice(18, 18 + credentialIdLength);
  
  // The public key starts after the credential ID. We pass the remaining slice.
  const publicKeyBytes = attestedCredentialData.slice(18 + credentialIdLength);
  
  return { 
    aaguid, 
    credentialIdLength, 
    credentialId, 
    publicKeyBytes
  };
}

function parseAuthenticatorData(authenticatorData) {
  let flags = authenticatorData[32];
  let counter = authenticatorData.slice(33, 37);
  let attestedCredentialData = null;

  if (flags & 0x40) { // AT flag indicating Attested Credential Data is present
    attestedCredentialData = parseAttestedCredentialData(authenticatorData.slice(37));
  }

  return {
    rpIdHash: authenticatorData.slice(0, 32),
    flags: {
      up: !!(flags & 0x01),
      uv: !!(flags & 0x04),
      at: !!(flags & 0x40),
      ed: !!(flags & 0x80),
    },
    counter: (counter[0] << 24) + (counter[1] << 16) + (counter[2] << 8) + counter[3],
    attestedCredentialData,
  };
}

function parseAttestationObject(attestation) {
  let cbor = new Cbor(attestation).getCBOR();
  return parseAuthenticatorData(cbor.authData);
}

// ==========================================
// Cryptography Utilities
// ==========================================
function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlToBuffer(base64url) {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function coseToJwk(coseBuffer) {
  const parsed = new Cbor(coseBuffer);
  const cbor = parsed.getCBOR();
  const kty = cbor[1];
  const alg = cbor[3];
  
  if (kty === 2) { // EC2
    const crv = cbor[-1];
    const x = cbor[-2];
    const y = cbor[-3];
    if (crv !== 1) throw new Error("Only P-256 curve is supported for EC2");
    return {
      kty: "EC",
      crv: "P-256",
      x: bufferToBase64Url(x),
      y: bufferToBase64Url(y),
      ext: true
    };
  } else if (kty === 3) { // RSA
    const n = cbor[-1];
    const e = cbor[-2];
    return {
      kty: "RSA",
      n: bufferToBase64Url(n),
      e: bufferToBase64Url(e),
      ext: true
    };
  }
  throw new Error("Unsupported COSE key type: " + kty);
}

function derToRaw(derBuffer) {
  const bin = new Uint8Array(derBuffer);
  if (bin[0] !== 0x30) return bin; // Return as-is if not DER
  
  let pos = 2;
  // Skip length if it is long form (should not be for P-256 signatures, but safe check)
  if (bin[pos] & 0x80) {
    const lenBytes = bin[pos] & 0x7f;
    pos += 1 + lenBytes;
  }
  
  if (bin[pos] !== 0x02) throw new Error("Invalid DER: expected integer for R");
  pos++;
  const rLen = bin[pos];
  pos++;
  let rBytes = bin.slice(pos, pos + rLen);
  pos += rLen;
  
  if (bin[pos] !== 0x02) throw new Error("Invalid DER: expected integer for S");
  pos++;
  const sLen = bin[pos];
  pos++;
  let sBytes = bin.slice(pos, pos + sLen);
  
  if (rBytes[0] === 0x00) rBytes = rBytes.slice(1);
  if (sBytes[0] === 0x00) sBytes = sBytes.slice(1);
  
  const raw = new Uint8Array(64);
  raw.set(rBytes, 32 - rBytes.length);
  raw.set(sBytes, 64 - sBytes.length);
  return raw;
}

function getShortHash(str) {
  if (!str) return 'N/A';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(6, '0').substring(0, 6).toUpperCase();
}

// ==========================================
// State Management (Local DB + URL Sharing)
// ==========================================
let db = { credentials: [] };

function loadDb() {
  const stored = localStorage.getItem('cmtg_demo_db');
  if (stored) {
    try {
      db = JSON.parse(stored);
    } catch (e) {
      logError("Failed to parse local DB: " + e.message);
    }
  }
}

function saveDb(selectedId) {
  localStorage.setItem('cmtg_demo_db', JSON.stringify(db));
  updateUI(selectedId);
}

function importStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get('state');
  if (!encoded) return;
  try {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const decoded = decodeURIComponent(escape(atob(base64)));
    const parsed = JSON.parse(decoded);
    if (parsed && Array.isArray(parsed.credentials)) {
      db = parsed;
      saveDb();
      logSuccess("Successfully imported state from URL parameters.");
      // Clean URL parameter so it doesn't persist on reload unless shared again
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  } catch (e) {
    logError("Failed to import state from URL: " + e.message);
  }
}

function getShareableUrl() {
  const stateStr = JSON.stringify(db);
  const encoded = btoa(unescape(encodeURIComponent(stateStr)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  const url = new URL(window.location.href);
  url.searchParams.set('state', encoded);
  return url.toString();
}

// ==========================================
// WebAuthn Operations & Verification
// ==========================================

async function verifyAssertionSignature(credentialRecord, assertion) {
  const clientDataHash = await crypto.subtle.digest("SHA-256", base64UrlToBuffer(assertion.response.clientDataJSON));
  const authData = base64UrlToBuffer(assertion.response.authenticatorData);
  
  const verifyData = new Uint8Array(authData.byteLength + clientDataHash.byteLength);
  verifyData.set(new Uint8Array(authData), 0);
  verifyData.set(new Uint8Array(clientDataHash), authData.byteLength);
  
  const jwk = coseToJwk(base64UrlToBuffer(credentialRecord.publicKey));
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    jwk.kty === "EC" ? { name: "ECDSA", namedCurve: "P-256" } : { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  
  let signatureBytes = base64UrlToBuffer(assertion.response.signature);
  


  const rawSignature = jwk.kty === "EC" ? derToRaw(signatureBytes) : signatureBytes;
  
  return await crypto.subtle.verify(
    jwk.kty === "EC" ? { name: "ECDSA", hash: "SHA-256" } : { name: "RSASSA-PKCS1-v1_5" },
    key,
    rawSignature,
    verifyData
  );
}

// Collects CMTG key outputs from both the new list-based extension
// (`cmtgKeys`, an array of {cmtgKey, signature}) and the legacy
// single-key extension (`cmtgKey`, a single {cmtgKey, signature}).
function getCmtgKeyOutputs(clientOutputs) {
  const outputs = [];
  if (Array.isArray(clientOutputs.cmtgKeys)) {
    outputs.push(...clientOutputs.cmtgKeys);
  }
  if (clientOutputs.cmtgKey) {
    outputs.push(clientOutputs.cmtgKey);
  }
  return outputs;
}

async function verifyCmtgSignature(authDataBuffer, clientDataJsonBase64, cmtgExtensionOutput) {
  const clientDataHash = await crypto.subtle.digest("SHA-256", base64UrlToBuffer(clientDataJsonBase64));
  const authData = new Uint8Array(authDataBuffer);
  
  const verifyData = new Uint8Array(authData.byteLength + clientDataHash.byteLength);
  verifyData.set(authData, 0);
  verifyData.set(new Uint8Array(clientDataHash), authData.byteLength);
  
  const cmtgKeyCose = base64UrlToBuffer(cmtgExtensionOutput.cmtgKey);
  const jwk = coseToJwk(cmtgKeyCose);
  
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    jwk.kty === "EC" ? { name: "ECDSA", namedCurve: "P-256" } : { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  
  let signatureBytes = base64UrlToBuffer(cmtgExtensionOutput.signature);
  


  const rawSignature = jwk.kty === "EC" ? derToRaw(signatureBytes) : signatureBytes;
  
  return await crypto.subtle.verify(
    jwk.kty === "EC" ? { name: "ECDSA", hash: "SHA-256" } : { name: "RSASSA-PKCS1-v1_5" },
    key,
    rawSignature,
    verifyData
  );
}

async function registerPasskey() {
  const username = document.getElementById('reg-username').value.trim();
  const requestCmtg = document.getElementById('reg-cmtg').checked;
  const onlyPlatform = document.getElementById('reg-platform').checked;
  
  if (!username) {
    logError("Please enter a username.");
    return;
  }
  
  logInfo(`Starting registration for user: "${username}"...`);
  
  // Clean mock challenge
  const challenge = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
  const userId = new TextEncoder().encode(username + Date.now()); // Unique user ID
  
  const options = {
    publicKey: {
      challenge: challenge,
      rp: { name: "CMTG Demo RP", id: window.location.hostname || "localhost" },
      user: {
        id: userId,
        name: username,
        displayName: username
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 }, // ES256
        { type: "public-key", alg: -257 } // RS256
      ],
      timeout: 60000,
      authenticatorSelection: {
        residentKey: "required",
        requireResidentKey: true,
        userVerification: "preferred"
      },
      extensions: {}
    }
  };
  
  if (onlyPlatform) {
    options.publicKey.authenticatorSelection.authenticatorAttachment = "platform";
    logInfo("Restricting to platform authenticator (authenticatorAttachment: 'platform')");
  }
  
  if (requestCmtg) {
    options.publicKey.extensions.cmtgKeys = true;
    options.publicKey.extensions.cmtgKey = true;
    logInfo("Requesting CMTG Keys extension (cmtgKeys: true)");
  }
  
  try {
    const credential = await navigator.credentials.create(options);
    logSuccess("Credential created successfully!");
    
    const credJSON = credential.toJSON();
    logInfo("Credential JSON:\n" + JSON.stringify(credJSON, null, 2));
    
    // Parse attestationObject to get public key
    const attObjBuffer = base64UrlToBuffer(credJSON.response.attestationObject);
    const parsedAtt = parseAttestationObject(attObjBuffer);
    
    if (!parsedAtt.attestedCredentialData) {
      throw new Error("No attested credential data in attestation object.");
    }
    
    const pubKeyBase64 = bufferToBase64Url(parsedAtt.attestedCredentialData.publicKeyBytes);
    
    // Check extension output
    const clientOutputs = credJSON.clientExtensionResults || {};
    const cmtgRecords = [];
    
    const cmtgKeys = getCmtgKeyOutputs(clientOutputs);
    if (cmtgKeys.length > 0) {
      logSuccess(`${cmtgKeys.length} CMTG Key(s) returned by authenticator!`);
      if (cmtgKeys.length > 1) {
        logInfo("Only the first CMTG key will be used; the rest are ignored.");
      }
      // This demo only looks at the first CMTG key.
      const cmtgOutput = cmtgKeys[0];
      logInfo(`CMTG Public Key: ${cmtgOutput.cmtgKey}`);
      logInfo(`CMTG Signature: ${cmtgOutput.signature}`);
      
      // Verify CMTG signature
      logInfo("Verifying CMTG signature...");
      try {
        const verified = await verifyCmtgSignature(
          new Cbor(attObjBuffer).getCBOR().authData,
          credJSON.response.clientDataJSON,
          cmtgOutput
        );
        if (verified) {
          logSuccess("[CMTG Verification] CMTG Signature verified successfully! Trust group authenticated.");
          cmtgRecords.push({
            publicKey: cmtgOutput.cmtgKey,
            lastUsed: Date.now()
          });
        } else {
          logError("[CMTG Verification] CMTG Signature verification FAILED!");
        }
      } catch (err) {
        logError("Error verifying CMTG signature: " + err.message);
      }
    } else if (requestCmtg) {
      logInfo("CMTG Keys were requested but none were returned by authenticator.");
    }
    
    // Add to DB
    db.credentials.push({
      id: credJSON.id,
      username: username,
      publicKey: pubKeyBase64,
      cmtgKeyRecords: cmtgRecords
    });
    
    saveDb(credJSON.id);
    logSuccess(`User "${username}" registered successfully!`);
    
  } catch (err) {
    logError("Registration failed: " + err.name + " - " + err.message);
    console.error(err);
  }
}

async function authenticatePasskey() {
  const usernameSelect = document.getElementById('login-username');
  const credentialId = usernameSelect.value;
  const requestCmtg = document.getElementById('login-cmtg').checked;
  
  if (!credentialId) {
    logError("Please select a user to authenticate.");
    return;
  }
  
  const credentialRecord = db.credentials.find(c => c.id === credentialId);
  if (!credentialRecord) {
    logError("Credential record not found.");
    return;
  }
  
  logInfo(`Starting authentication for user: "${credentialRecord.username}"...`);
  
  const challenge = new Uint8Array([17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]);
  
  const options = {
    publicKey: {
      challenge: challenge,
      rpId: window.location.hostname || "localhost",
      allowCredentials: [{
        type: "public-key",
        id: base64UrlToBuffer(credentialId)
      }],
      userVerification: "preferred",
      extensions: {}
    }
  };
  
  if (requestCmtg) {
    options.publicKey.extensions.cmtgKeys = true;
    options.publicKey.extensions.cmtgKey = true;
    logInfo("Requesting CMTG Keys extension (cmtgKeys: true)");
  }
  
  try {
    const assertion = await navigator.credentials.get(options);
    logSuccess("Assertion received successfully!");
    
    const assertionJSON = assertion.toJSON();
    logInfo("Assertion JSON:\n" + JSON.stringify(assertionJSON, null, 2));
    
    // Verify assertion signature
    logInfo("Verifying main WebAuthn assertion signature...");
    const assertionVerified = await verifyAssertionSignature(credentialRecord, assertionJSON);
    if (assertionVerified) {
      logSuccess("[Assertion Verification] WebAuthn Assertion signature verified successfully! User authenticated.");
    } else {
      logError("[Assertion Verification] WebAuthn Assertion signature verification FAILED!");
    }
    
    // Check CMTG extension output
    const clientOutputs = assertionJSON.clientExtensionResults || {};
    const cmtgKeys = getCmtgKeyOutputs(clientOutputs);
    if (cmtgKeys.length > 0) {
      logSuccess(`${cmtgKeys.length} CMTG Key(s) returned by authenticator during authentication!`);
      if (cmtgKeys.length > 1) {
        logInfo("Only the first CMTG key will be used; the rest are ignored.");
      }
      // This demo only looks at the first CMTG key.
      const cmtgOutput = cmtgKeys[0];
      logInfo(`CMTG Public Key: ${cmtgOutput.cmtgKey}`);
      logInfo(`CMTG Signature: ${cmtgOutput.signature}`);
      
      // Verify CMTG signature
      logInfo("Verifying CMTG signature...");
      try {
        const verified = await verifyCmtgSignature(
          base64UrlToBuffer(assertionJSON.response.authenticatorData),
          assertionJSON.response.clientDataJSON,
          cmtgOutput
        );
        
        if (verified) {
          logSuccess("[CMTG Verification] CMTG Signature verified successfully!");
          
          // Check if CMTG key is already known
          const existingRecord = credentialRecord.cmtgKeyRecords.find(r => r.publicKey === cmtgOutput.cmtgKey);
          if (existingRecord) {
            logSuccess("Known trust group detected. Updating timestamp.");
            existingRecord.lastUsed = Date.now();
          } else {
            logInfo("New trust group detected! Adding to credential record.");
            credentialRecord.cmtgKeyRecords.push({
              publicKey: cmtgOutput.cmtgKey,
              lastUsed: Date.now()
            });
          }
          saveDb();
        } else {
          logError("[CMTG Verification] CMTG Signature verification FAILED!");
        }
      } catch (err) {
        logError("Error verifying CMTG signature: " + err.message);
      }
    } else if (requestCmtg) {
      logInfo("CMTG Keys were requested but none were returned by authenticator.");
    }
    
  } catch (err) {
    logError("Authentication failed: " + err.name + " - " + err.message);
    console.error(err);
  }
}

// ==========================================
// UI Rendering & Event Listeners
// ==========================================

function updateUI(selectedId) {
  const table = document.getElementById('credentials-table');
  const noCreds = document.getElementById('no-credentials');
  const tbody = document.getElementById('credentials-list');
  const select = document.getElementById('login-username');
  
  // Keep selected value if possible, fallback to selectedId
  const selectedVal = selectedId || select.value;
  select.innerHTML = '';
  tbody.innerHTML = '';
  
  if (db.credentials.length === 0) {
    select.innerHTML = '<option value="">-- Select Registered User --</option>';
    table.style.display = 'none';
    noCreds.style.display = 'block';
    return;
  }
  
  table.style.display = 'table';
  noCreds.style.display = 'none';
  
  let hasSelected = false;
  db.credentials.forEach(cred => {
    // Dropdown options
    const option = document.createElement('option');
    option.value = cred.id;
    option.textContent = cred.username;
    if (cred.id === selectedVal) {
      option.selected = true;
      hasSelected = true;
    }
    select.appendChild(option);
    
    // Table rows
    const row = document.createElement('tr');
    
    // User
    const userTd = document.createElement('td');
    userTd.textContent = cred.username;
    row.appendChild(userTd);
    
    // Credential ID (truncated)
    const idTd = document.createElement('td');
    const displayId = cred.id.substring(0, 8) + '...';
    idTd.innerHTML = `<span class="truncated-key" title="${cred.id}">${displayId}</span>`;
    row.appendChild(idTd);
    
    // Public Key (hashed)
    const pkTd = document.createElement('td');
    const displayPk = getShortHash(cred.publicKey);
    pkTd.innerHTML = `<span class="truncated-key" title="${cred.publicKey}">${displayPk}</span>`;
    row.appendChild(pkTd);
    
    // CMTG Keys
    const cmtgTd = document.createElement('td');
    if (cred.cmtgKeyRecords.length === 0) {
      cmtgTd.textContent = "None";
    } else {
      const list = document.createElement('ul');
      list.className = 'key-list';
      cred.cmtgKeyRecords.forEach((key, index) => {
        const item = document.createElement('li');
        item.className = 'key-item';
        const displayKey = getShortHash(key.publicKey);
        const timeStr = new Date(key.lastUsed).toLocaleTimeString();
        item.innerHTML = `<strong>Group ${index + 1}:</strong> <span class="truncated-key" title="${key.publicKey}">${displayKey}</span> (Last used: ${timeStr})`;
        list.appendChild(item);
      });
      cmtgTd.appendChild(list);
    }
    row.appendChild(cmtgTd);
    
    tbody.appendChild(row);
  });
  
  if (!hasSelected && select.options.length > 0) {
    select.options[0].selected = true;
  }
}

// Check CMTG support
async function initSupportCheck() {
  const banner = document.getElementById('support-banner');
  if (!window.PublicKeyCredential) {
    banner.className = "error-banner";
    banner.textContent = "❌ WebAuthn is not supported in this browser.";
    logError("WebAuthn is not supported in this browser.");
    return;
  }
  
  if (typeof PublicKeyCredential.getClientCapabilities !== 'function') {
    banner.className = "warning-banner";
    banner.innerHTML = "⚠️ <code>PublicKeyCredential.getClientCapabilities()</code> is not supported. Cannot verify if CMTG is supported. Real CMTG keys may not be returned.";
    logInfo("getClientCapabilities() is not supported.");
    return;
  }
  
  try {
    const caps = await PublicKeyCredential.getClientCapabilities();
    logInfo("Client capabilities: " + JSON.stringify(caps));
    if (caps['extension:cmtgKeys'] || caps['extension:cmtgKey']) {
      banner.className = "success-banner";
      banner.textContent = "✅ CMTG Keys extension is supported by this browser!";
      logSuccess("CMTG Keys extension (extension:cmtgKeys) is supported.");
    } else {
      banner.className = "error-banner";
      banner.textContent = "❌ CMTG Keys extension (extension:cmtgKeys) is NOT supported by this browser.";
      logError("CMTG Keys extension (extension:cmtgKeys) is NOT supported.");
    }
  } catch (err) {
    banner.className = "error-banner";
    banner.textContent = "❌ Failed to query client capabilities: " + err.message;
    logError("Failed to query capabilities: " + err.message);
  }
}

// Page Load
window.addEventListener('DOMContentLoaded', () => {
  loadDb();
  importStateFromUrl();
  updateUI();
  initSupportCheck();
  
  document.getElementById('register-btn').addEventListener('click', registerPasskey);
  document.getElementById('login-btn').addEventListener('click', authenticatePasskey);
  
  document.getElementById('copy-share-btn').addEventListener('click', () => {
    const url = getShareableUrl();
    navigator.clipboard.writeText(url).then(() => {
      logSuccess("Shareable URL copied to clipboard!");
    }).catch(err => {
      logError("Failed to copy URL: " + err.message);
    });
  });
  
  document.getElementById('clear-db-btn').addEventListener('click', () => {
    if (confirm("Are you sure you want to clear the local database? All registered credentials will be deleted.")) {
      db = { credentials: [] };
      saveDb();
      logInfo("Local database cleared.");
    }
  });
});
