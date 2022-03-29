"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
(() => {
    const overlayEl = document.querySelector("#overlay");
    const secretEl = document.querySelector("#secret");
    const authorEl = secretEl.querySelector("#author");
    secretEl.onclick = () => __awaiter(void 0, void 0, void 0, function* () {
        showOverlay().then(() => {
            authorEl.style.opacity = "1";
            authorEl.style.transform = "none";
            buttonEl.onclick = () => overlayEl.remove();
        });
    });
    if (location.hash != "#installed")
        return;
    location.hash = "";
    const installedEl = overlayEl.firstElementChild;
    const buttonEl = installedEl.querySelector("button");
    showOverlay().then(() => {
        installedEl.style.opacity = "1";
        installedEl.style.transform = "none";
        buttonEl.onclick = () => overlayEl.remove();
    });
    function showOverlay() {
        return new Promise(res => {
            overlayEl.style.display = "block";
            overlayEl.offsetWidth; // NOSONAR
            overlayEl.style.opacity = "1";
            setTimeout(() => res, 250);
        });
    }
})();
