document.getElementById("username").innerText =
  new URLSearchParams(window.location.search).get("username");

document.getElementById("logout").addEventListener("click", (e) => {
  e.preventDefault();
  window.location = "/?message=Logged out successfully";
});