const overlayEl = document.querySelector("#overlay") as HTMLElement;
const secretEl = document.querySelector("#secret") as HTMLElement;
const authorEl = document.querySelector("#author") as HTMLElement;
const closeAuthorEl = authorEl.querySelector("button") as HTMLElement;

if (/#installed|#updated/.test(location.hash)) showWelcome();

secretEl.onclick = stopZoom;

function showWelcome() {
  const installedEl = overlayEl.querySelector(location.hash) as HTMLElement;
  const closeWelcomeEl = installedEl.querySelector("button") as HTMLElement;
  location.hash = "";
  authorEl.style.display = "none";
  installedEl.style.display = "block";
  showOverlay().then(() => {
    installedEl.style.opacity = "1";
    installedEl.style.transform = "none";
    closeWelcomeEl.onclick = () => {
      installedEl.remove();
      hideOverlay();
      setTimeout(() => (authorEl.style.display = "block"), 500);
    };
  });
}

function stopZoom() {
  window.addEventListener("zoom-stopped", showAuthor, { once: true });
  window.dispatchEvent(new Event("stop-zoom"));
}
function showAuthor() {
  showOverlay().then(() => {
    authorEl.style.opacity = "1";
    authorEl.style.transform = "none";
    closeAuthorEl.onclick = hideOverlay;
  });
}
function showOverlay() {
  return new Promise((resolve) => {
    overlayEl.style.opacity = "1";
    overlayEl.style.pointerEvents = "auto";
    setTimeout(resolve, 250);
  });
}
function hideOverlay() {
  setTimeout(() => authorEl.removeAttribute("style"), 500);
  overlayEl.removeAttribute("style");
}
