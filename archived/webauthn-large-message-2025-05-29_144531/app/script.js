/* If you're feeling fancy you can add interactivity 
    to your site with Javascript */

let startNormalRequest = () => {
  navigator.credentials
    .create({
      publicKey: {
        rp: { name: "Caribou" },
        user: {
          id: new ArrayBuffer(8),
          displayName: "Nadeshiko",
          name: "nade",
        },
        challenge: new ArrayBuffer(1000000000), // 1gb
        pubKeyCredParams: [],
      },
    })
    .then((credential) => {
      if (credential) {
        console.log(credential);
        console.log(credential.getClientExtensionResults());
        let username = String.fromCodePoint(
          ...new Uint8Array(credential.response.userHandle)
        );
        window.location = "site.html?username=" + username;
      } else {
        showError("Credential returned null");
      }
    })
    .catch((error) => {
      showError(error.toString());
    });
};

document.getElementById("manual-login").addEventListener("click", (e) => {
  e.preventDefault();
  startNormalRequest();
});
