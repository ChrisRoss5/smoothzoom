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
let docStyle;
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
let isExitingZoom = false;
let isRightClickPressed = false;
// Fullscreen problem
let inFullscreenZoom = false;
let fullscreenEl;
let fullscreenElParent;
let fullscreenElIdx;
let fullscreenElStyle;
/*
 * Possible solution #2: Instead of changing fullscreenEl position in DOM, all
 * its ancestors need to have the highest specificity style which defines values:
 * filter, transform, backdrop-filter, perspective, contain,
 * transform-style, content-visibility, and will-change as none.
 */
// Elements with position "fixed" problem
let fixedElsMapped = [];
/*
 * Previous solution (slow): [...doc.getElementsByTagName("*")].filter((el) =>
 * getComputedStyle(el).position == "fixed");
 */
/* --- */
const listeners = {
    isCreatingScreenshot: false,
    onWheel(e) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!(helpers.isZoomReady(e) || inZoom))
                return;
            e.preventDefault();
            if (this.isCreatingScreenshot || isExitingZoom)
                return;
            if (!inZoom) {
                if (storage.useScreenshot) {
                    this.isCreatingScreenshot = true;
                    yield control.createScreenshot();
                    this.isCreatingScreenshot = false;
                }
                helpers.enableZoom();
            }
            if (!inFullscreenZoom) {
                fullscreenEl = document.fullscreenElement;
                if (fullscreenEl && fullscreenEl != doc)
                    yield control.setFullscreenZoom();
            }
            control.scale(e);
        });
    },
    onMousemove(e) {
        if (!inZoom || isExitingZoom)
            return;
        helpers.setStyleProperty("transition", "none");
        control.transformOrigin(e);
    },
    onMousedown(e) {
        if (e.button == 2)
            isRightClickPressed = true;
    },
    onMouseup(e) {
        if (isRightClickPressed && e.button == 2) {
            isRightClickPressed = false;
            if (inZoom && storage.activationKey == "rightClick")
                // Using setTimeout to allow onContextmenu() before inZoom == false;
                setTimeout(control.exitZoom);
        }
    },
    onContextmenu(e) {
        if (inZoom)
            e.preventDefault();
    },
    onKeyup(e) {
        if (inZoom && helpers.isZoomOver(e))
            control.exitZoom();
    },
};
const control = {
    scale(e) {
        const zoomType = -Math.sign(e.deltaY);
        const strength = zoomType * helpers.getStrength(storage.strength);
        const easeIn = (zoomType == -1 && !zoomLevel) || zoomLevel < 0;
        zoomLevel = Math.max(-0.9, zoomLevel + strength / (easeIn ? 4 : 1));
        helpers.setStyleProperty("transition", `transform ${storage.transition}ms`);
        helpers.setStyleProperty("transform", `scale(${1 + zoomLevel})`);
        this.transformOrigin(e);
    },
    transformOrigin(e) {
        const useClient = storage.useScreenshot || inFullscreenZoom;
        const [x, y] = useClient ? [e.clientX, e.clientY] : [e.pageX, e.pageY];
        helpers.setStyleProperty("transform-origin", `${x}px ${y}px`);
    },
    isDoubleClick: false,
    exitZoom() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isDoubleClick && (!storage.holdToZoom || inFullscreenZoom)) {
                this.isDoubleClick = true;
                return;
            }
            this.isDoubleClick = false;
            isExitingZoom = true;
            helpers.setStyleProperty("transition", `transform ${storage.transition}ms`);
            helpers.setStyleProperty("transform", "none");
            if (inFullscreenZoom)
                yield control.removeFullscreenZoom();
            else
                yield utils.sleep(storage.transition);
            helpers.disableZoom();
            if (storage.useScreenshot)
                targetEl.remove();
            targetEl = doc;
            isExitingZoom = false;
        });
    },
    setFullscreenZoom() {
        return __awaiter(this, void 0, void 0, function* () {
            inFullscreenZoom = true;
            yield document.exitFullscreen();
            doc.requestFullscreen(); // This "eats" the first event
            if (storage.useScreenshot)
                return;
            fullscreenElStyle = fullscreenEl.getAttribute("style") || "";
            fullscreenElParent = fullscreenEl.parentElement;
            fullscreenElIdx = utils.getChildIndex(fullscreenEl);
            helpers.setTargetEl(doc.appendChild(fullscreenEl));
        });
    },
    removeFullscreenZoom() {
        return __awaiter(this, void 0, void 0, function* () {
            inFullscreenZoom = false;
            yield document.exitFullscreen();
            fullscreenEl.requestFullscreen(); // New event is required to allow this action
            if (storage.useScreenshot)
                return;
            targetEl.setAttribute("style", fullscreenElStyle);
            utils.insertChild(fullscreenElParent, fullscreenEl, fullscreenElIdx);
        });
    },
    createScreenshot() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage("TAKE_SCREENSHOT", (dataUrl) => {
                const img = document.createElement("img");
                helpers.setTargetEl(doc.appendChild(img));
                img.onload = resolve;
                img.src = dataUrl;
            });
        });
    },
};
const helpers = {
    enableZoom() {
        inZoom = true;
        docStyle = doc.getAttribute("style") || "";
        this.setStyleProperty("width", "100vw");
        this.setStyleProperty("height", "100vh");
        this.setStyleProperty("overflow", "hidden");
        if (!storage.websiteInteractivity)
            this.setStyleProperty("pointer-events", "none");
        if (storage.useScreenshot)
            return;
        doc.setAttribute("in-zoom", doc.scrollTop + "px");
        this.setStyleProperty("--zoom-top", doc.scrollTop + "px");
        this.setStyleProperty("--zoom-left", doc.scrollLeft + "px");
        fixedElsMapped = utils.getFixedElements().map((el) => {
            const elInfo = { el, style: el.getAttribute("style") || "" };
            const rect = el.getBoundingClientRect();
            this.setStyleProperty("top", rect.top + doc.scrollTop + "px", el);
            this.setStyleProperty("left", rect.left + doc.scrollLeft + "px", el);
            this.setStyleProperty("height", rect.height + "px", el);
            this.setStyleProperty("width", rect.width + "px", el);
            this.setStyleProperty("transition", "none", el);
            return elInfo;
        });
    },
    disableZoom() {
        inZoom = false;
        doc.setAttribute("style", docStyle);
        zoomLevel = 0;
        if (storage.useScreenshot)
            return;
        doc.removeAttribute("in-zoom");
        fixedElsMapped.forEach(({ el, style }) => el.setAttribute("style", style));
    },
    isZoomReady(e) {
        return ((isRightClickPressed && storage.activationKey == "rightClick") ||
            (e.altKey && storage.activationKey == "altKey") ||
            (e.ctrlKey && storage.activationKey == "ctrlKey") ||
            (e.shiftKey && storage.activationKey == "shiftKey"));
    },
    isZoomOver(e) {
        return ((e.key == "Alt" && storage.activationKey == "altKey") ||
            (e.key == "Control" && storage.activationKey == "ctrlKey") ||
            (e.key == "Shift" && storage.activationKey == "shiftKey"));
    },
    getStrength(percentage) {
        if (percentage < 0.5)
            return 0.25 + 1.5 * percentage;
        return 1 + 6 * (percentage - 0.5);
    },
    setTargetEl(el) {
        targetEl = el;
        this.setStyleProperty("position", "fixed");
        this.setStyleProperty("top", "0");
        this.setStyleProperty("left", "0");
        this.setStyleProperty("width", "100vw");
        this.setStyleProperty("height", "100vh");
        this.setStyleProperty("outline", "3px solid red");
        this.setStyleProperty("box-shadow", "0 0 15px 3px red");
        this.setStyleProperty("z-index", "9999999999999999999");
        this.setStyleProperty("background", "black"); // For fullscreen elements
    },
    setStyleProperty(key, value, el) {
        (el || targetEl).style.setProperty(key, value, "important");
    },
    updateStorage(key, value) {
        storage[key] = value;
    },
};
const utils = {
    getChildIndex(node) {
        return Array.prototype.indexOf.call(node.parentElement.childNodes, node);
    },
    insertChild(parent, child, idx) {
        parent.insertBefore(child, parent.childNodes[idx]);
    },
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    },
    isVisible(el) {
        return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    },
    getFixedElements() {
        let q = "[style*='position:fixed'],[style*='position: fixed']";
        for (const { cssRules, disabled } of document.styleSheets) {
            if (disabled)
                continue;
            for (const rule of cssRules) {
                if (!(rule instanceof CSSStyleRule))
                    continue;
                if (rule.style.position == "fixed")
                    q += "," + rule.selectorText;
            }
        }
        console.log(q);
        return [...doc.querySelectorAll(q)].filter((el) => getComputedStyle(el).position == "fixed");
    },
};
chrome.storage.sync.get(null, (response) => {
    storage = Object.assign(Object.assign({}, storage), response);
    document.addEventListener("wheel", listeners.onWheel, { passive: false });
    document.addEventListener("mousemove", listeners.onMousemove);
    document.addEventListener("mousedown", listeners.onMousedown);
    document.addEventListener("mouseup", listeners.onMouseup);
    document.addEventListener("contextmenu", listeners.onContextmenu);
    document.addEventListener("keyup", listeners.onKeyup);
});
chrome.storage.onChanged.addListener((changes) => {
    for (const key of Object.keys(changes))
        helpers.updateStorage(key, changes[key].newValue);
});
