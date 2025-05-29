/* If you're feeling fancy you can add interactivity 
    to your site with Javascript */

window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(
  result => {
    if (!result) {
      showError("No platform authenticator found. If your OS does not come with one, try using devtools to set one up.");
    }
  }
);


let abortController;
let abortSignal;

let startNormalRequest = () => {
  abortController = new AbortController();
  abortSignal = abortController.signal;
  console.log('starting webauthn conditional ui request');
  navigator.credentials.get({
    signal: abortSignal,
    publicKey: {
      // don't do this in production!
      challenge: new Uint8Array([1, 2, 3, 4])
    },
  }).then(credential => {
    if (credential) {
      let username = String.fromCodePoint(...new Uint8Array(credential.response.userHandle));
      window.location = "site.html?username=" + username;
    } else {
      showError("Credential returned null");
    }
  }).catch(error => {
    showError(error.toString());
  });
  
  window.setTimeout(() => {
    console.log('aborting!');
    abortController.abort();
  }, +document.getElementById("abort-time").value);
}

document.getElementById("manual-login").addEventListener("click", (e) => {
  e.preventDefault();
  startNormalRequest();
});