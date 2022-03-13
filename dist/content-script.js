"use strict";
/* https://developer.chrome.com/docs/extensions/reference/tabCapture */
/* https://html2canvas.hertzen.com/ */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
// TABCAPTURE IS BROKEN -- using html2canvas as alternative
// chrome.tabCapture.capture({ audio: false, video: false }, (callback) => {
//   console.log(callback);
// });
const doc = document.documentElement;
let targetEl = doc;
let storage = {
    activationKey: "rightClick",
    websiteInteractivity: true,
    holdToZoom: true,
    useCanvas: false,
    strength: 1,
};
let rightClickPressed = false;
let isDoubleClick = false;
let inZoom = false;
let zoomLevel = 0;
let canvasLoaded = false;
let isRenderingCanvas = false;
chrome.storage.sync.get(null, (response) => {
    storage = Object.assign(Object.assign({}, storage), response);
    if (storage.useCanvas)
        chrome.runtime.sendMessage("useCanvas", () => (canvasLoaded = true));
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
    console.log(JSON.stringify(storage, null, 4));
    if (storage.useCanvas && !canvasLoaded)
        chrome.runtime.sendMessage("useCanvas", () => (canvasLoaded = true));
});
function onWheel(e) {
    return __awaiter(this, void 0, void 0, function* () {
        const _inZoom = (rightClickPressed && storage.activationKey == "rightClick") ||
            (e.altKey && storage.activationKey == "altKey") ||
            (e.ctrlKey && storage.activationKey == "ctrlKey") ||
            (e.shiftKey && storage.activationKey == "shiftKey");
        if (_inZoom) {
            e.preventDefault();
            if (isRenderingCanvas)
                return;
            if (!inZoom && storage.useCanvas && canvasLoaded) {
                isRenderingCanvas = true;
                yield createCanvas();
                isRenderingCanvas = false;
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
    const zoom = Math.sign(e.deltaY) * getStrength(storage.strength);
    zoomLevel = Math.max(-0.75, zoomLevel - zoom);
    setStyleProperty("transition", "transform 100ms");
    setStyleProperty("transform", `scale(${1 + zoomLevel})`);
    transformOrigin(e);
}
function transformOrigin(e) {
    const [x, y] = storage.useCanvas && canvasLoaded
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
    setStyleProperty("transition", "transform 100ms");
    setStyleProperty("transform", "none");
    if (!storage.websiteInteractivity)
        setStyleProperty("pointer-events", "auto");
    if (targetEl.className != "zoom-canvas")
        return;
    setTimeout(() => {
        targetEl.remove();
        targetEl = doc;
    }, 100);
}
function createCanvas() {
    return new Promise((resolve) => {
        window
            .html2canvas(doc, {
            x: window.scrollX,
            y: window.scrollY,
            width: window.innerWidth,
            height: window.innerHeight,
        })
            .then((canvas) => {
            targetEl = doc.appendChild(canvas);
            targetEl.className = "zoom-canvas";
            targetEl.offsetHeight; // NOSONAR -> reflow for transition
            resolve();
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
