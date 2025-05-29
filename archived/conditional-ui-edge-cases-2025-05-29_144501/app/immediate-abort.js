showMessage("Ready");

document.getElementById("start-webauthn-request").addEventListener("click", () => {
  let abortController = new AbortController();
  let abortSignal = abortController.signal;
  showMessage("Waiting...");
  let triggerDelay = document.getElementById("trigger-delay").value;
  if (triggerDelay === "") {
    triggerDelay = 0;
  }
  window.setTimeout(() => {
    showMessage("Waiting...");
    navigator.credentials.get({
      signal: abortSignal,
      publicKey: {
        // Don't do this in production!
        challenge: new Uint8Array([1, 2, 3, 4]),
        allowCredentials: [
          //{ type: 'public-key', id: new Uint8Array([1, 2, 3, 4]), transports: ["usb", "hybrid"] }
        ],
      },
    }).then(credential => {
      showError("Request succeded (not expected)");
    }).catch(error => {
      if (error.toString() == "aborted")
        showMessage("Successfully aborted :)");
      else
        showError(error.toString());
    });
    try {
      let delay = document.getElementById("delay").value;
      if (delay === "") {
        delay = 0;
      }
      window.setTimeout(() => abortController.abort("aborted"), delay);
    } catch (error) {
      showError(error.toString());
    }
  }, triggerDelay);
});