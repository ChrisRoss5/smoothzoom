const box = document.querySelector("#box") as HTMLElement;
const moreInfo = box.querySelector("#more-info") as HTMLElement;
const overlayEl = document.querySelector("#overlay") as HTMLElement;
const secretEl = document.querySelector("#secret") as HTMLElement;
const authorEl = document.querySelector("#author") as HTMLElement;
const closeAuthorEl = authorEl.querySelector("button") as HTMLElement;

closeAuthorEl.onclick = hideOverlay;
moreInfo.onclick = showMoreInfo;
secretEl.onclick = () => window.dispatchEvent(new Event("stop-zoom"));
window.addEventListener("zoom-stopped", showAuthor);

if (location.hash == "#author") showAuthor();
else if (/#installed|#updated/.test(location.hash)) showWelcome();

function showWelcome() {
  const installedEl = overlayEl.querySelector(location.hash) as HTMLElement;
  const closeWelcomeEl = installedEl.querySelector("button") as HTMLElement;
  location.hash = "";
  moreInfo.style.display = "none";
  authorEl.style.display = "none";
  installedEl.style.display = "block";
  showOverlay().then(() => {
    installedEl.style.opacity = "1";
    installedEl.style.transform = "none";
    closeWelcomeEl.onclick = () => {
      installedEl.remove();
      hideOverlay();
      setTimeout(() => {
        authorEl.style.display = "block";
        box.classList.add("opened");
      }, 500);
    };
  });
}
function showAuthor() {
  showOverlay().then(() => {
    authorEl.style.opacity = "1";
    authorEl.style.transform = "none";
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
function showMoreInfo() {
  box.classList.add("opened");
  moreInfo.style.opacity = "0";
}
