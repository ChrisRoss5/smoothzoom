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
const doc = document.documentElement;
let targetEl = doc;
let storage = {
    activationKey: "rightClick",
    websiteInteractivity: true,
    holdToZoom: true,
    useScreenshot: false,
    strength: 1,
    transition: 200,
};
let zoomLevel = 0;
let inZoom = false;
let isRightClickPressed = false;
let isDoubleClick = false;
let isCreatingScreenshot = false;
// Fullscreen problems
let inFullscreenZoom = false;
let fullscreenEl;
chrome.storage.sync.get(null, (response) => {
    storage = Object.assign(Object.assign({}, storage), response);
    document.addEventListener("wheel", onWheel, { passive: false });
    document.addEventListener("mousemove", onMousemove);
    document.addEventListener("mousedown", onMousedown);
    document.addEventListener("mouseup", onMouseup);
    document.addEventListener("contextmenu", onContextmenu);
    document.addEventListener("keyup", onKeyup);
});
chrome.storage.onChanged.addListener((changes) => {
    for (const key of Object.keys(changes))
        updateStorage(key, changes[key].newValue);
});
/* Listeners */
function onWheel(e) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!isZoomReady(e) && !inZoom)
            return;
        e.preventDefault();
        // Screenshot
        if (isCreatingScreenshot)
            return;
        if (!inZoom && storage.useScreenshot) {
            isCreatingScreenshot = true;
            yield createScreenshot();
            isCreatingScreenshot = false;
        }
        // Website interactivity
        if (!storage.websiteInteractivity)
            setStyleProperty("pointer-events", "none");
        // Fullscreen problems
        if (!inFullscreenZoom) {
            fullscreenEl = document.fullscreenElement;
            if (fullscreenEl)
                yield setFullscreenZoom();
        }
        inZoom = true;
        scale(e);
    });
}
function onMousemove(e) {
    if (!inZoom)
        return;
    setStyleProperty("transition", "none");
    transformOrigin(e);
}
function onMousedown(e) {
    if (e.button == 2)
        isRightClickPressed = true;
}
function onMouseup(e) {
    if (isRightClickPressed && e.button == 2) {
        isRightClickPressed = false;
        // Using setTimeout to allow onContextmenu() before inZoom == false;
        if (inZoom && storage.activationKey == "rightClick")
            setTimeout(removeZoom);
    }
}
function onContextmenu(e) {
    if (inZoom)
        e.preventDefault();
}
function onKeyup(e) {
    if (inZoom && isZoomOver(e))
        removeZoom();
}
/* Control */
function scale(e) {
    const zoomType = -Math.sign(e.deltaY);
    const strength = zoomType * getStrength(storage.strength);
    const easeIn = (zoomType == -1 && !zoomLevel) || zoomLevel < 0;
    zoomLevel = Math.max(-0.9, zoomLevel + strength / (easeIn ? 4 : 1));
    setStyleProperty("transition", `transform ${storage.transition}ms`);
    setStyleProperty("transform", `scale(${1 + zoomLevel})`);
    transformOrigin(e);
}
function transformOrigin(e) {
    const [x, y] = storage.useScreenshot || inFullscreenZoom
        ? [e.clientX, e.clientY]
        : [e.pageX, e.pageY];
    setStyleProperty("transform-origin", `${x}px ${y}px`);
}
function removeZoom() {
    if (!isDoubleClick && (!storage.holdToZoom || inFullscreenZoom)) {
        isDoubleClick = true;
        return;
    }
    isDoubleClick = false;
    zoomLevel = 0;
    inZoom = false;
    setStyleProperty("transition", `transform ${storage.transition}ms`);
    setStyleProperty("transform", "none");
    if (!storage.websiteInteractivity)
        setStyleProperty("pointer-events", "auto");
    // Fullscreen problems
    if (inFullscreenZoom) {
        inFullscreenZoom = false;
        document.exitFullscreen().then(() => {
            if (storage.useScreenshot)
                targetEl.remove();
            else
                targetEl.removeAttribute("zoom-topmost");
            fullscreenEl.requestFullscreen(); // New event is required to allow this action
            targetEl = doc;
        });
        return;
    }
    // Screenshot
    if (targetEl.hasAttribute("zoom-topmost")) {
        setTimeout(() => {
            targetEl.remove();
            targetEl = doc;
        }, storage.transition);
    }
}
function setFullscreenZoom() {
    return __awaiter(this, void 0, void 0, function* () {
        inFullscreenZoom = true;
        yield document.exitFullscreen();
        doc.requestFullscreen(); // This "eats" the first event
        if (!storage.useScreenshot)
            setNewTargetEl(fullscreenEl);
    });
}
function createScreenshot() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage("TAKE_SCREENSHOT", (dataUrl) => {
            const img = document.createElement("img");
            setNewTargetEl(doc.appendChild(img));
            img.onload = resolve;
            img.src = dataUrl;
        });
    });
}
/* Helpers */
function isZoomReady(e) {
    return ((isRightClickPressed && storage.activationKey == "rightClick") ||
        (e.altKey && storage.activationKey == "altKey") ||
        (e.ctrlKey && storage.activationKey == "ctrlKey") ||
        (e.shiftKey && storage.activationKey == "shiftKey"));
}
function isZoomOver(e) {
    return ((e.key == "Alt" && storage.activationKey == "altKey") ||
        (e.key == "Control" && storage.activationKey == "ctrlKey") ||
        (e.key == "Shift" && storage.activationKey == "shiftKey"));
}
function setNewTargetEl(el) {
    targetEl = el;
    targetEl.setAttribute("zoom-topmost", "");
}
function setStyleProperty(key, value) {
    targetEl.style.setProperty(key, value, "important");
}
function getStrength(percentage) {
    if (percentage < 0.5)
        return 0.25 + 1.5 * percentage;
    return 1 + 6 * (percentage - 0.5);
}
function updateStorage(key, value) {
    storage[key] = value;
}
