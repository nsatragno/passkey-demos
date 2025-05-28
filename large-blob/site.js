document.getElementById("username").innerText =
  new URLSearchParams(window.location.search).get("username");

document.getElementById("blob").value =
  new URLSearchParams(window.location.search).get("blob");

let storeBlob = () => {
  let blob = document.querySelector("#blob").value;
  console.log("Storing", blob);
  navigator.credentials.get({
    publicKey: {
      // don't do this in production!
      challenge: new Uint8Array([1, 2, 3, 4]),
      allowCredentials: [{
        id: base64ToArrayBuffer(window.localStorage.credentialId),
        type: "public-key",
      }],
      extensions: {
        largeBlob: {
          write: Uint8Array.from(blob.split("").map(c => c.codePointAt(0))),
        }
      }
    },
  }).then(credential => {
    if (credential) {
      console.log(credential);
      console.log(credential.getClientExtensionResults());
      document.getElementById("blob").value = blob;
      if (credential.getClientExtensionResults().largeBlob.written) {
        showMessage("Blob stored successfully");
      } else {
        showError("Credential returned but blob could not be written");
      }
    } else {
      showError("Credential returned null");
    }
  }).catch(error => {
    showError(error.toString());
  });
}

document.getElementById("store").addEventListener("click", (e) => {
  e.preventDefault();
  storeBlob();
});

document.getElementById("logout").addEventListener("click", (e) => {
  e.preventDefault();
  window.location = "/?message=Logged out successfully";
});