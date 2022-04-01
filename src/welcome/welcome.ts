const overlayEl = document.querySelector("#overlay") as HTMLElement;
const secretEl = document.querySelector("#secret") as HTMLElement;
const authorEl = document.querySelector("#author") as HTMLElement;
const closeAuthorEl = authorEl.querySelector("button") as HTMLElement;

if (location.hash == "#installed") showWelcome();
secretEl.onclick = stopZoom;
//showAuthor();

function showWelcome() {
  //todo location.hash = "";
  const installedEl = overlayEl.querySelector("#installed") as HTMLElement;
  const closeWelcomeEl = installedEl.querySelector("button") as HTMLElement;
  installedEl.style.display = "block";
  showOverlay().then(() => {
    installedEl.style.opacity = "1";
    installedEl.style.transform = "none";
    closeWelcomeEl.onclick = () => {
      installedEl.remove();
      hideOverlay();
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
    overlayEl.style.display = "block";
    overlayEl.offsetWidth; // NOSONAR
    overlayEl.style.opacity = "1";
    setTimeout(resolve, 250);
  });
}
function hideOverlay() {
  overlayEl.style.opacity = "0";
  overlayEl.style.display = "none";
}
