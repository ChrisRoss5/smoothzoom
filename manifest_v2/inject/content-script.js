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
/* For testing: http://motherfuckingwebsite.com/ */
(() => {
    const html = document.documentElement;
    let docStyle;
    let targetEl = html;
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
    let isPreparingZoom = false;
    let isExitingZoom = false;
    let isRightClickPressed = false;
    let isDoubleClick = false;
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
    let fixedElements = [];
    /*
     * Previous solution (100% working but slow):
     * [...doc.getElementsByTagName("*")].filter((el) =>
     * getComputedStyle(el).position == "fixed");
     */
    const listeners = {
        onWheel(e) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!(helpers.isZoomReady(e) || inZoom))
                    return;
                e.preventDefault();
                if (isPreparingZoom || isExitingZoom)
                    return;
                if (!inZoom) {
                    isPreparingZoom = true;
                    if (storage.useScreenshot)
                        yield control.createScreenshot();
                    fullscreenEl = document.fullscreenElement;
                    if (fullscreenEl && fullscreenEl != html)
                        yield control.setFullscreenZoom();
                    control.enableZoom();
                    isPreparingZoom = false;
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
                // Using setTimeout to allow onContextmenu() before inZoom == false;
                if (storage.activationKey != "rightClick")
                    return;
                if (inZoom)
                    setTimeout(control.exitZoom);
                else if (isPreparingZoom)
                    isDoubleClick = true;
            }
        },
        onContextmenu(e) {
            if (inZoom || isPreparingZoom)
                e.preventDefault();
        },
        onKeyup(e) {
            if (!helpers.isZoomOver(e))
                return;
            if (inZoom)
                control.exitZoom();
            else if (isPreparingZoom)
                isDoubleClick = true;
        },
        onScroll() {
            if (!inZoom || storage.useScreenshot)
                return;
            helpers.setStyleProperty("--zoom-top", html.scrollTop + "px");
            helpers.setStyleProperty("--zoom-left", html.scrollLeft + "px");
        },
    };
    const control = {
        enableZoom() {
            inZoom = true;
            if (storage.useScreenshot)
                return;
            docStyle = html.getAttribute("style") || "";
            if (!storage.websiteInteractivity)
                helpers.setStyleProperty("pointer-events", "none");
            if (inFullscreenZoom)
                return;
            const { x, y } = utils.getHTMLScrollbarsWidth();
            helpers.setStyleProperty("width", "calc(100vw - " + x + "px)");
            helpers.setStyleProperty("height", "calc(100vh - " + y + "px)");
            helpers.setStyleProperty("overflow", "hidden");
            html.setAttribute("in-zoom", "");
            helpers.setStyleProperty("--zoom-top", html.scrollTop + "px");
            helpers.setStyleProperty("--zoom-left", html.scrollLeft + "px");
            fixedElements = utils.getFixedElements().map((el) => {
                const elInfo = { el, style: el.getAttribute("style") || "" };
                const rect = el.getBoundingClientRect();
                helpers.setStyleProperty("top", rect.top + html.scrollTop + "px", el);
                helpers.setStyleProperty("left", rect.left + html.scrollLeft + "px", el);
                helpers.setStyleProperty("height", rect.height + "px", el);
                helpers.setStyleProperty("width", rect.width + "px", el);
                helpers.setStyleProperty("transition", "none", el);
                return elInfo;
            });
        },
        disableZoom() {
            inZoom = false;
            zoomLevel = 0;
            if (storage.useScreenshot || inFullscreenZoom)
                return;
            html.setAttribute("style", docStyle);
            html.removeAttribute("in-zoom");
            fixedElements.forEach(({ el, style }) => el.setAttribute("style", style));
        },
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
        exitZoom() {
            return __awaiter(this, void 0, void 0, function* () {
                if (!isDoubleClick && (!storage.holdToZoom || inFullscreenZoom)) {
                    isDoubleClick = true;
                    return;
                }
                isDoubleClick = false;
                isExitingZoom = true;
                helpers.setStyleProperty("transition", `transform ${storage.transition}ms`);
                helpers.setStyleProperty("transform", "none");
                if (inFullscreenZoom)
                    yield control.removeFullscreenZoom();
                else
                    yield utils.sleep(storage.transition);
                control.disableZoom();
                if (storage.useScreenshot)
                    targetEl.remove();
                targetEl = html;
                isExitingZoom = false;
            });
        },
        setFullscreenZoom() {
            return __awaiter(this, void 0, void 0, function* () {
                inFullscreenZoom = true;
                yield document.exitFullscreen();
                html.requestFullscreen(); // This "eats" the first event
                if (storage.useScreenshot)
                    return;
                fullscreenElStyle = fullscreenEl.getAttribute("style") || "";
                fullscreenElParent = fullscreenEl.parentElement;
                fullscreenElIdx = utils.getChildIndex(fullscreenEl);
                helpers.setTargetEl(html.appendChild(fullscreenEl));
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
                    helpers.setTargetEl(html.appendChild(img));
                    img.onload = resolve;
                    img.src = dataUrl;
                });
            });
        },
    };
    const helpers = {
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
            return !!(el.offsetWidth ||
                el.offsetHeight ||
                el.getClientRects().length);
        },
        getFixedElements() {
            let selectors = "[style*='position:fixed'],[style*='position: fixed']";
            for (const stylesheet of document.styleSheets) {
                if (stylesheet.disabled)
                    continue;
                try {
                    for (const rule of stylesheet.cssRules) {
                        if (!(rule instanceof CSSStyleRule))
                            continue;
                        if (rule.style.position == "fixed")
                            selectors += "," + rule.selectorText;
                    }
                }
                catch (_a) { } // CORS
            }
            return [...html.querySelectorAll(selectors)].filter((el) => getComputedStyle(el).position == "fixed");
        },
        getHTMLScrollbarsWidth() {
            const { clientWidth, clientHeight } = html;
            const { innerWidth, innerHeight } = window;
            return { x: innerWidth - clientWidth, y: innerHeight - clientHeight };
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
        document.addEventListener("scroll", listeners.onScroll);
    });
    chrome.storage.onChanged.addListener((changes) => {
        for (const key of Object.keys(changes))
            helpers.updateStorage(key, changes[key].newValue);
    });
})();
