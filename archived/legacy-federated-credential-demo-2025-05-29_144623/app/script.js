document.getElementById("button").addEventListener("click", event => {
  event.preventDefault();
  
  const cred = new window.FederatedCredential({
    id: document.getElementById("id").value,
    name: document.getElementById("name").value,
    provider: document.getElementById("provider").value,
    iconURL: document.getElementById("icon").value,
  });

  // Store it
  navigator.credentials.store(cred).then((result) => {
    console.log("done: ", result);
    document.getElementById("result").innerText = "Done!";
  }).catch(error => {
    document.getElementById("result").innerText = "Error: " + error.toString();
  });
});
