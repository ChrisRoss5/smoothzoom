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
    transition: 200
};
let rightClickPressed = false;
let isDoubleClick = false;
let inZoom = false;
let zoomLevel = 0;
let isCreatingScreenshot = false;
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
/* Functions */
function onWheel(e) {
    return __awaiter(this, void 0, void 0, function* () {
        const zoomReady = (rightClickPressed && storage.activationKey == "rightClick") ||
            (e.altKey && storage.activationKey == "altKey") ||
            (e.ctrlKey && storage.activationKey == "ctrlKey") ||
            (e.shiftKey && storage.activationKey == "shiftKey");
        if (zoomReady || inZoom) {
            e.preventDefault();
            if (isCreatingScreenshot)
                return;
            if (!inZoom && storage.useScreenshot) {
                isCreatingScreenshot = true;
                yield createScreenshot();
                isCreatingScreenshot = false;
            }
            if (!storage.websiteInteractivity)
                setStyleProperty("pointer-events", "none");
            inZoom = true;
            scale(e);
        }
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
        rightClickPressed = true;
}
function onMouseup(e) {
    if (rightClickPressed && e.button == 2) {
        rightClickPressed = false;
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
    if (!inZoom)
        return;
    if ((e.key == "Alt" && storage.activationKey == "altKey") ||
        (e.key == "Control" && storage.activationKey == "ctrlKey") ||
        (e.key == "Shift" && storage.activationKey == "shiftKey"))
        removeZoom();
}
function scale(e) {
    const zoomType = -Math.sign(e.deltaY);
    zoomLevel = Math.max(-0.75, zoomLevel +
        (zoomType * getStrength(storage.strength)) /
            ((!zoomLevel && zoomType == -1) || zoomLevel < 0 ? 4 : 1));
    setStyleProperty("transition", `transform ${storage.transition}ms`);
    setStyleProperty("transform", `scale(${1 + zoomLevel})`);
    transformOrigin(e);
}
function transformOrigin(e) {
    const [x, y] = storage.useScreenshot
        ? [e.clientX, e.clientY]
        : [e.pageX, e.pageY];
    setStyleProperty("transform-origin", `${x}px ${y}px`);
}
function removeZoom() {
    if (!storage.holdToZoom && !isDoubleClick) {
        isDoubleClick = true;
        return;
    }
    isDoubleClick = false;
    inZoom = false;
    zoomLevel = 0;
    setStyleProperty("transition", `transform ${storage.transition}ms`);
    setStyleProperty("transform", "none");
    if (!storage.websiteInteractivity)
        setStyleProperty("pointer-events", "auto");
    if (targetEl.id != "zoom-screenshot")
        return;
    setTimeout(() => {
        targetEl.remove();
        targetEl = doc;
    }, 100);
}
function createScreenshot() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage("TAKE_SCREENSHOT", (dataUrl) => {
            const img = document.createElement("img");
            targetEl = doc.appendChild(img);
            targetEl.id = "zoom-screenshot";
            img.onload = resolve;
            img.src = dataUrl;
        });
    });
}
/* Utils */
function setStyleProperty(key, value) {
    targetEl.style.setProperty(key, value, "important");
}
function updateStorage(key, value) {
    storage[key] = value;
}
function getStrength(percentage) {
    if (percentage < 0.5)
        return 0.25 + 1.5 * percentage;
    return 1 + 6 * (percentage - 0.5);
}
