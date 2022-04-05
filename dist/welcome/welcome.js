"use strict";
const overlayEl = document.querySelector("#overlay");
const secretEl = document.querySelector("#secret");
const authorEl = document.querySelector("#author");
const closeAuthorEl = authorEl.querySelector("button");
if (location.hash == "#installed")
    showWelcome();
secretEl.onclick = stopZoom;
//showAuthor();
function showWelcome() {
    //todo location.hash = "";
    const installedEl = overlayEl.querySelector("#installed");
    const closeWelcomeEl = installedEl.querySelector("button");
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
