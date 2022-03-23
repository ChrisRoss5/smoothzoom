"use strict";
(() => {
    if (location.hash != "#installed")
        return;
    location.hash = "";
    const overlayEl = document.querySelector("#overlay");
    const installedEl = overlayEl.firstElementChild;
    const buttonEl = installedEl.querySelector("button");
    overlayEl.style.display = "block";
    overlayEl.offsetWidth; // NOSONAR
    overlayEl.style.opacity = "1";
    setTimeout(() => {
        installedEl.style.opacity = "1";
        installedEl.style.transform = "none";
    }, 250);
    buttonEl.onclick = () => overlayEl.remove();
})();
