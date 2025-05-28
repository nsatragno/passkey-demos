/* If you're feeling fancy you can add interactivity 
    to your site with Javascript */

if (!window.localStorage.credentialId) {
  showError("No WebAuthn credential detected, sign up first");
}

let startNormalRequest = () => {
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
          read: true,
        }
      }
    },
  }).then(credential => {
    if (credential) {
      console.log(credential);
      console.log(credential.getClientExtensionResults());
      let username = String.fromCodePoint(...new Uint8Array(credential.response.userHandle));
      if (typeof credential.getClientExtensionResults().largeBlob === "undefined") {
        showError("Large blob is undefined -- your browser probably doesn't know about it");
        return;
      }
      let blob = String.fromCodePoint(...new Uint8Array(credential.getClientExtensionResults().largeBlob.blob));
      window.location = "site.html?username=" + username + "&blob=" + blob;
    } else {
      showError("Credential returned null");
    }
  }).catch(error => {
    showError(error.toString());
  });
}

document.getElementById("manual-login").addEventListener("click", (e) => {
  e.preventDefault();
  startNormalRequest();
});