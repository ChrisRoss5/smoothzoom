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
    usePointerEvents: true,
    useDoubleClick: false,
    useCanvas: false,
    strength: 1,
};
let rightClickPressed = false;
let inZoom = false;
let zoomLevel = 0;
let useCanvas = false;
let isRenderingCanvas = false;
chrome.storage.local.get(null, (response) => {
    storage = Object.assign(Object.assign({}, storage), response);
    if (storage.useCanvas)
        chrome.runtime.sendMessage("useCanvas", () => (useCanvas = true));
    document.addEventListener("wheel", onWheel, { passive: false });
    document.addEventListener("mousemove", onMousemove);
    document.addEventListener("mousedown", onMousedown);
    document.addEventListener("mouseup", onMouseup);
    document.addEventListener("contextmenu", onContextmenu);
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
            if (!inZoom && useCanvas) {
                isRenderingCanvas = true;
                yield createCanvas();
                isRenderingCanvas = false;
            }
            inZoom = true;
            scale(e);
        }
    });
}
function onMousemove(e) {
    if (!inZoom)
        return;
    targetEl.style.transition = "none";
    transformOrigin(e);
}
function onMousedown(e) {
    if (e.button == 2)
        rightClickPressed = true;
}
function onMouseup(e) {
    if (rightClickPressed && e.button == 2) {
        rightClickPressed = false;
        if (inZoom && storage.activationKey == "rightClick")
            setTimeout(removeZoom);
    }
}
function onContextmenu(e) {
    if (inZoom)
        e.preventDefault();
}
function scale(e) {
    zoomLevel = Math.max(0, zoomLevel - Math.sign(e.deltaY) * storage.strength);
    targetEl.style.transition = "transform 100ms";
    targetEl.style.transform = `scale(${1 + zoomLevel})`;
    transformOrigin(e);
}
function transformOrigin(e) {
    const [x, y] = useCanvas ? [e.clientX, e.clientY] : [e.pageX, e.pageY];
    targetEl.style.transformOrigin = `${x}px ${y}px`;
}
function removeZoom() {
    inZoom = false;
    zoomLevel = 0;
    targetEl.style.transition = "transform 100ms";
    targetEl.style.transform = "none";
    if (!useCanvas)
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
