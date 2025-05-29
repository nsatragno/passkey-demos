/* If you're feeling fancy you can add interactivity 
    to your site with Javascript */

window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(
  result => {
    if (!result) {
      showError("No platform authenticator found. This test  site requires either a Mac with TouchID, or Windows with Windows Hello enabled");
    }
  }
);


let checkBrowser = async () => {
  if (window.PublicKeyCredential.isConditionalMediationAvailable) {
    console.log("Conditional UI is understood by the browser");
    if (!await window.PublicKeyCredential.isConditionalMediationAvailable()) {
      showError("Error: Conditional UI not available. This should not happen, are you running with the right flags?");
      return;
    }
  } else {
    if (!navigator.credentials.conditionalMediationSupported) {
      showError("Your browser does not implement Conditional UI (are you running Chrome?)");
      return;
    } else {
      console.log("This browser understand the old version of Conditional UI feature detection (are you running old Chrome?)");
    }
  }
}

checkBrowser();

document.getElementById("usePasskey").addEventListener("click", () => {
  event.preventDefault();
  navigator.credentials.get({
    publicKey: {
      // don't do this in production!
      challenge: new Uint8Array([1, 2, 3, 4])
    },
  }).then(credential => {
    window.location = "step5.html";
  }).catch(error => {
    showError(error.toString());
  });
});