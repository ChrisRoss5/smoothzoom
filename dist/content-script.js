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
let isRemovingZoom = false;
let isRightClickPressed = false;
let isDoubleClick = false;
let isCreatingScreenshot = false;
// Fullscreen problems
let inFullscreenZoom = false;
let fullscreenEl;
let fullscreenElParent;
let fullscreenElIdx;
let fullscreenElStyle;
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
        if ((!isZoomReady(e) && !inZoom) || isRemovingZoom)
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
        // Fullscreen problems
        if (!inFullscreenZoom) {
            fullscreenEl = document.fullscreenElement;
            if (fullscreenEl && fullscreenEl != doc)
                yield setFullscreenZoom();
        }
        enableZoom();
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
    const useClient = storage.useScreenshot || inFullscreenZoom;
    const [x, y] = useClient ? [e.clientX, e.clientY] : [e.pageX, e.pageY];
    setStyleProperty("transform-origin", `${x}px ${y}px`);
}
function removeZoom() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!isDoubleClick && (!storage.holdToZoom || inFullscreenZoom)) {
            isDoubleClick = true;
            return;
        }
        isDoubleClick = false;
        isRemovingZoom = true;
        setStyleProperty("transition", `transform ${storage.transition}ms`);
        setStyleProperty("transform", "none");
        yield sleep(storage.transition);
        disableZoom();
        if (inFullscreenZoom) {
            // Fullscreen problems
            inFullscreenZoom = false;
            document.exitFullscreen().then(() => {
                if (storage.useScreenshot)
                    targetEl.remove();
                else
                    resetTargetStyle();
                insertChild(fullscreenElParent, fullscreenEl, fullscreenElIdx);
                fullscreenEl.requestFullscreen(); // New event is required to allow this action
                targetEl = doc;
            });
        }
        else if (targetEl.hasAttribute("zoom-topmost")) {
            // Screenshot
            targetEl.remove();
            targetEl = doc;
        }
        isRemovingZoom = false;
    });
}
function setFullscreenZoom() {
    return __awaiter(this, void 0, void 0, function* () {
        inFullscreenZoom = true;
        yield document.exitFullscreen();
        doc.requestFullscreen(); // This "eats" the first event
        if (storage.useScreenshot)
            return;
        fullscreenElStyle = fullscreenEl.getAttribute("style") || "";
        fullscreenElParent = fullscreenEl.parentElement;
        fullscreenElIdx = getChildIndex(fullscreenEl);
        setTargetEl(doc.appendChild(fullscreenEl));
    });
}
function createScreenshot() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage("TAKE_SCREENSHOT", (dataUrl) => {
            const img = document.createElement("img");
            setTargetEl(doc.appendChild(img));
            img.onload = resolve;
            img.src = dataUrl;
        });
    });
}
/* Helpers */
function enableZoom() {
    inZoom = true;
    doc.setAttribute("in-zoom", "");
    if (!storage.websiteInteractivity)
        setStyleProperty("pointer-events", "none");
}
function disableZoom() {
    inZoom = false;
    doc.removeAttribute("in-zoom");
    if (!storage.websiteInteractivity)
        setStyleProperty("pointer-events", "auto");
    zoomLevel = 0;
}
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
function getStrength(percentage) {
    if (percentage < 0.5)
        return 0.25 + 1.5 * percentage;
    return 1 + 6 * (percentage - 0.5);
}
function setTargetEl(el) {
    targetEl = el;
    targetEl.setAttribute("zoom-topmost", "");
    setStyleProperty("position", "fixed");
    setStyleProperty("top", "0");
    setStyleProperty("left", "0");
    setStyleProperty("width", "calc(100vw)");
    setStyleProperty("height", "calc(100vh)");
    setStyleProperty("outline", "3px solid red");
    setStyleProperty("box-shadow", "0 0 15px 3px red");
    setStyleProperty("z-index", "9999999999999999999");
    setStyleProperty("background", "black");
}
function resetTargetStyle() {
    targetEl.setAttribute("style", fullscreenElStyle);
}
function setStyleProperty(key, value) {
    targetEl.style.setProperty(key, value, "important");
}
function updateStorage(key, value) {
    storage[key] = value;
}
/* Utils */
function getChildIndex(node) {
    return Array.prototype.indexOf.call(node.parentElement.childNodes, node);
}
function insertChild(parent, child, idx) {
    parent.insertBefore(child, parent.childNodes[idx]);
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
