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
let counter = 0;

let startConditionalRequest = async () => {
  document.getElementById('counter').innerText = ++counter;
  console.log('starting conditional ui request');
  if (window.PublicKeyCredential.isConditionalMediationAvailable) {
    console.log("Conditional UI is understood by the browser");
    if (!await window.PublicKeyCredential.isConditionalMediationAvailable()) {
      showError("Conditional UI is understood by your browser but not available");
      return;
    }
  } else {
    // Normally, this would mean Conditional Mediation is not available. However, the "current"
    // development implementation on chrome exposes availability via
    // navigator.credentials.conditionalMediationSupported. You won't have to add this code
    // by the time the feature is released.
    if (!navigator.credentials.conditionalMediationSupported) {
      showError("Your browser does not implement Conditional UI (are you running the right chrome/safari version with the right flags?)");
      return;
    } else {
      console.log("This browser understand the old version of Conditional UI feature detection");
    }
  }
  abortController = new AbortController();
  abortSignal = abortController.signal;
  navigator.credentials.get({
    signal: abortSignal,
    publicKey: {
      // Don't do this in production!
      challenge: new Uint8Array([1, 2, 3, 4])
    },
    mediation: "conditional"
  }).then(credential => {
    let username = String.fromCodePoint(...new Uint8Array(credential.response.userHandle));
    window.location = "site.html?username=" + username;
  }).catch(error => {
    if (error == "restart") {
      startConditionalRequest();
      return;
    } else if (error == "manual abort") {
      return;
    }
    showError(error.toString());
  });
  if (counter > 1)
    abortController.abort("restart");
}

startConditionalRequest();


document.getElementById("abort-request").addEventListener("click", (e) => {
  e.preventDefault();
  abortController.abort("restart");
  return false;
});