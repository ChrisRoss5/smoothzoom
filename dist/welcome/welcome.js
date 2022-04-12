"use strict";
const overlayEl = document.querySelector("#overlay");
const secretEl = document.querySelector("#secret");
const authorEl = document.querySelector("#author");
const closeAuthorEl = authorEl.querySelector("button");
if (/#installed|#updated/.test(location.hash))
    showWelcome();
secretEl.onclick = stopZoom;
function showWelcome() {
    const installedEl = overlayEl.querySelector(location.hash);
    const closeWelcomeEl = installedEl.querySelector("button");
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
