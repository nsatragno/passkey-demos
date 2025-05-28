let userData;

function addPasskey(event) {
  event.preventDefault();
  navigator.credentials
    .create({
      publicKey: {
        // if you're reading this code for inspiration, don't do this!!!
        // this challenge should be random per request and verified on the server.
        // i'm just lazy and don't want to code a server.
        challenge: Uint8Array.from([1, 2, 3, 4]),
        rp: {
          name: "Touhou fan site",
        },
        user: {
          id: base64UrlToBuffer(localStorage.currentUser),
          name: userData[localStorage.currentUser].username,
          displayName: "", // ignored these days by most implementations
        },
        pubKeyCredParams: [],
        authenticatorSelection: {
          userVerification: "required",
          residentKey: "required",
          authenticatorAttachment: "platform",
        },
        excludeCredentials: userData[localStorage.currentUser].passkeys.map(
          (passkey) => ({
            id: base64UrlToBuffer(passkey.id),
            type: "public-key",
          })
        ),
      },
    })
    .then((credential) => {
      let credentialData = parseAttestationObject(
        credential.response.attestationObject
      );
      console.log("Credential data: ", credentialData);
      let passkeyIndex =
        userData[localStorage.currentUser].passkeys.push({
          id: credential.id,
          data: credentialData,
        }) - 1;
      localStorage.users = JSON.stringify(userData);
      showMessage("New passkey created");
      addPasskeyRow(
        passkeyIndex,
        userData[localStorage.currentUser].passkeys[passkeyIndex]
      );
    })
    .catch((error) => {
      if (error.name === "InvalidStateError") {
        showMessage("You already have a passkey with that provider");
      } else {
        console.error(error);
        showError(error.toString());
      }
    });
}

function updateChar() {
  userData[localStorage.currentUser].favouriteChar =
    document.getElementById("favourite-char").value;
  document.getElementById("favourite-char-bio").innerText =
    BIOS[userData[localStorage.currentUser].favouriteChar];
  setTimeout(() => localStorage.users = JSON.stringify(userData), 0);
  console.log('done');
}

function changeUsername(event) {
  event.preventDefault();
  let newUsername = document.getElementById("change-username").value;
  if (newUsername.length === 0) {
    showError("Cannot change to an empty username");
    return;
  }
  userData[localStorage.currentUser].username = newUsername;
  localStorage.users = JSON.stringify(userData);
  showMessage(
    "You are now known as " + document.getElementById("change-username").value
  );
  document.getElementById("username").innerText = newUsername;
  signalUserDetails();
}

function signOut() {
  localStorage.currentUser = null;
  window.location = "index.html?message=Signed%20out.";
}

function signalCurrentCredentials() {
  PublicKeyCredential.signalAllAcceptedCredentials({
    rpId: window.location.hostname,
    userId: base64ToBase64Url(localStorage.currentUser),
    allAcceptedCredentialIds: userData[localStorage.currentUser].passkeys.map(
      (passkey) => passkey.id
    ),
  });
}

function signalUserDetails() {
  PublicKeyCredential.signalCurrentUserDetails({
    rpId: window.location.hostname,
    userId: base64ToBase64Url(localStorage.currentUser),
    name: userData[localStorage.currentUser].username,
    displayName: "",
  });
}

function addPasskeyRow(passkeyIndex, passkey) {
  let passkeyTableBody = document.getElementById("passkey-table-body");
  let tr = document.createElement("tr");
  tr.setAttribute("data-passkey-index", passkeyIndex);

  let aaguidTd = document.createElement("td");
  let authenticator = AAGUIDS[passkey.data.attestedCredentialData.aaguid]?.name;
  if (authenticator === undefined) {
    authenticator = "Unknown authenticator";
  }
  aaguidTd.innerText = authenticator;
  tr.append(aaguidTd);

  let idTd = document.createElement("td");
  idTd.innerText = passkey.id;
  tr.append(idTd);

  let buttonTd = document.createElement("td");
  let deleteButton = document.createElement("button");
  deleteButton.innerText = "Remove";
  deleteButton.addEventListener("click", () => {
    removePasskey(passkeyIndex);
  });
  buttonTd.append(deleteButton);
  tr.append(buttonTd);
  passkeyTableBody.append(tr);
}

function removePasskey(passkeyIndex) {
  if (userData[localStorage.currentUser].passkeys.length <= 1) {
    showMessage(
      "That was your last passkey! Make sure you add another one before you sign out"
    );
  }
  userData[localStorage.currentUser].passkeys.splice(passkeyIndex, 1);
  localStorage.users = JSON.stringify(userData);
  document
    .querySelector("[data-passkey-index='" + passkeyIndex + "']")
    .remove();
  signalCurrentCredentials();
}

document
  .getElementById("favourite-char")
  .addEventListener("change", updateChar);
document.getElementById("sign-out").addEventListener("click", signOut);
document
  .getElementById("change-username-button")
  .addEventListener("click", changeUsername);
document.getElementById("add-passkey").addEventListener("click", addPasskey);

function load() {
  if (!localStorage.currentUser) {
    window.location = "index.html?message=Not%20signed%20in.";
    return;
  }
  if (localStorage.users) {
    userData = JSON.parse(localStorage.users);
  }
  if (!userData || !userData[localStorage.currentUser]) {
    window.location = "index.html?message=User%20not%20found.";
    return;
  }
  let { username, passkeys } = userData[localStorage.currentUser];
  document.getElementById("username").innerText = username;
  document.getElementById("change-username").value = username;

  let favouriteCharControl = document.getElementById("favourite-char");
  CHARACTERS.forEach((character) => {
    let option = document.createElement("option");
    option.value = character;
    option.innerText = character;
    if (userData[localStorage.currentUser].favouriteChar == character) {
      option.selected = true;
    }
    favouriteCharControl.append(option);
  });
  updateChar();

  for (let passkeyIndex = 0; passkeyIndex < passkeys.length; ++passkeyIndex) {
    addPasskeyRow(passkeyIndex, passkeys[passkeyIndex]);
  }
  signalCurrentCredentials();
  signalUserDetails();
}

load();
