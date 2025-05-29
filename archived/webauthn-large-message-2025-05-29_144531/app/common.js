let errorContainer = document.getElementById("error");
let messageContainer = document.getElementById("message");

function arrayBufferToBase64(buffer) {
	let binary = "";
	let bytes = new Uint8Array(buffer);
	for (let i = 0; i < bytes.byteLength; ++i) {
		binary += String.fromCharCode(bytes[i]);
	}
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  let binaryString =  window.atob(base64);
  let bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function showError(error) {
  console.error(error);
  errorContainer.innerText = error;
  errorContainer.style.display = "block";
}

function showMessage(message) {
  console.info(message);
  messageContainer.innerText = message;
  messageContainer.style.display = "block";
}

let message = new URLSearchParams(window.location.search).get("message");
if (message && message !== "") {
  showMessage(message);
}