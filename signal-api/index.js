/* If you're feeling fancy you can add interactivity 
    to your site with Javascript */

function random(max) {
  return Math.floor(Math.random() * max);
}

window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(
  (result) => {
    if (!result) {
      showError(
        "No platform authenticator found. Do you have the correct hardware & software combination?."
      );
    }
  }
);

document.getElementById("username").value =
  CHARACTERS[random(CHARACTERS.length)];

const missingApi = [
  "signalUnknownCredential",
  "signalCurrentUserDetails",
  "signalAllAcceptedCredentials",
].filter((api) => {
  return !window.PublicKeyCredential[api];
});
if (missingApi.length) {
  showError(
    "The following APIs are missing: " +
      missingApi.join(", ") +
      ". Have you tried on Chrome Canary with the experimental web platform feature flag?"
  );
}

document.getElementById("sign-in-button").addEventListener("click", (e) => {
  e.preventDefault();
  navigator.credentials
    .get({
      publicKey: {
        // don't do this in production!
        challenge: new Uint8Array([1, 2, 3, 4]),
      },
    })
    .then((credential) => {
      if (credential) {
        localStorage.currentUser = bufferToBase64Url(
          new Uint8Array(credential.response.userHandle)
        );
        let userData;
        if (localStorage.users) {
          userData = JSON.parse(localStorage.users);
        }
        if (
          !userData ||
          !userData[localStorage.currentUser] ||
          !userData[localStorage.currentUser].passkeys.find(
            (passkey) => passkey.id === credential.id
          )
        ) {
          showError("Passkey not recognized");
          PublicKeyCredential.signalUnknownCredential({
            rpId: window.location.hostname,
            credentialId: credential.id,
          });
          return;
        }
        window.location = "site.html";
      } else {
        showError("Credential returned null");
      }
    })
    .catch((error) => {
      showError(error.toString());
    });
});

document.getElementById("sign-up-button").addEventListener("click", (e) => {
  e.preventDefault();
  const username = document.getElementById("username").value;
  let userId = new Uint8Array(64);
  window.crypto.getRandomValues(userId);
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
          id: userId,
          name: username,
          displayName: "", // ignored these days by most implementations
        },
        pubKeyCredParams: [],
        authenticatorSelection: {
          userVerification: "required",
          residentKey: "required",
          authenticatorAttachment: "platform",
        },
      },
    })
    .then((credential) => {
      let credentialData = parseAttestationObject(
        credential.response.attestationObject
      );
      console.log("Credential data: ", credentialData);
      let userData;
      if (!localStorage.users) {
        userData = {};
      } else {
        userData = JSON.parse(localStorage.users);
      }
      let b64urlUserId = bufferToBase64Url(userId);
      userData[b64urlUserId] = {
        username,
        favouriteChar: CHARACTERS[random(CHARACTERS.length)],
        passkeys: [
          {
            id: credential.id,
            data: credentialData,
          },
        ],
      };
      localStorage.users = JSON.stringify(userData);
      localStorage.currentUser = b64urlUserId;
      window.location = "site.html";
    })
    .catch((error) => {
      console.error(error);
      showError(error.toString());
    });
});

document.getElementById("clearLocalStorage").addEventListener("click", () => {
  localStorage.clear();
  showMessage("Local storage cleared");
});
