"use strict";
/* Created with Typescript & SCSS by Kristijan Rosandić */
/* For testing: http://motherfuckingwebsite.com/ */
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
    const html = document.documentElement;
    let docStyle;
    let targetEl = html;
    let storage = {
        activationKey: "rightClick",
        websiteInteractivity: true /* https://stackoverflow.com/questions/32467151/how-to-disable-javascript-in-chrome-developer-tools-programmatically */,
        followCursor: true,
        holdToZoom: true,
        useScreenshot: false,
        strength: 0.5,
        transition: 200,
    };
    let zoomLevel = 0;
    let inZoom = false;
    let isPreparingZoom = false;
    let isExitingZoom = false;
    let isRightClickPressed = false;
    let isDoubleClick = false;
    let lastZoomOrigin = { x: 0, y: 0 };
    /*
     * -- Fullscreen problem --
     * Current solution: Instead of changing fullscreenEl position in DOM, all
     * its ancestors need to have the highest specificity style which defines values:
     * filter, transform, backdrop-filter, perspective, contain,
     * transform-style, content-visibility, and will-change as none.
     */
    let inFullscreenZoom = false;
    let fullscreenEl;
    let fullscreenElAncestors = [];
    /*
     * -- Elements with position "fixed" problem --
     * Previous solution (100% working but slow):
     * [...doc.getElementsByTagName("*")].filter((el) => getComputedStyle(el).position == "fixed");
     * Current solution:
     * Reading CSS stylesheets, but due to CORS some might fail.
     * Possible solution (CHROME DEBUGGER):
     * https://stackoverflow.com/questions/63790794/get-css-rules-chrome-extension
     */
    let fixedElements = [];
    /* Functions */
    const listeners = {
        onWheel(e) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!(helpers.isZoomReady(e) || inZoom))
                    return;
                listeners.stop(e, true);
                if (isPreparingZoom || isExitingZoom)
                    return;
                if (!inZoom)
                    yield control.prepareZoom();
                control.scale(e);
            });
        },
        onMousemove(e) {
            if (!inZoom || isExitingZoom || !storage.followCursor)
                return;
            control.transformOrigin(e, 0);
        },
        onMousedown(e) {
            if (e.button == 2)
                isRightClickPressed = true;
        },
        onMouseup(e) {
            if (!(isRightClickPressed && e.button == 2))
                return;
            isRightClickPressed = false;
            if (storage.activationKey != "rightClick")
                return;
            // Using setTimeout to allow onContextmenu() before inZoom == false;
            if (inZoom)
                setTimeout(control.exitZoom);
            else if (isPreparingZoom)
                isDoubleClick = true;
        },
        onContextmenu(e) {
            listeners.stop(e);
        },
        onKeyup(e) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!helpers.isZoomOver(e))
                    return;
                listeners.stop(e);
                if (inZoom)
                    control.exitZoom();
                else if (isPreparingZoom)
                    isDoubleClick = true;
            });
        },
        onScroll() {
            if (!inZoom || storage.useScreenshot)
                return;
            helpers.setStyleProperty("--zoom-top", html.scrollTop + "px");
            helpers.setStyleProperty("--zoom-left", html.scrollLeft + "px");
        },
        stop(e, force) {
            if (inZoom || isPreparingZoom || isExitingZoom || force) {
                e.stopPropagation();
                e.stopImmediatePropagation();
                e.preventDefault();
            }
        },
    };
    const control = {
        prepareZoom() {
            return __awaiter(this, void 0, void 0, function* () {
                isPreparingZoom = true;
                if (storage.useScreenshot)
                    yield control.createScreenshot();
                fullscreenEl = document.fullscreenElement;
                if (fullscreenEl && fullscreenEl != html)
                    yield control.setFullscreenZoom();
                control.enableZoom();
                isPreparingZoom = false;
            });
        },
        enableZoom() {
            inZoom = true;
            if (storage.useScreenshot)
                return;
            if (!storage.websiteInteractivity)
                html.setAttribute("no-events", "");
            if (inFullscreenZoom)
                return;
            docStyle = html.getAttribute("style") || "";
            const { x, y } = utils.getHTMLScrollbarsWidth();
            helpers.setStyleProperty("width", "calc(100vw - " + x + "px)");
            helpers.setStyleProperty("height", "calc(100vh - " + y + "px)");
            html.setAttribute("in-zoom", "");
            helpers.setStyleProperty("--zoom-top", html.scrollTop + "px");
            helpers.setStyleProperty("--zoom-left", html.scrollLeft + "px");
            fixedElements = utils.getFixedElements().map((el) => {
                const elInfo = { el, style: el.getAttribute("style") || "" };
                const rect = el.getBoundingClientRect();
                const newTop = rect.top + html.scrollTop + "px";
                const newLeft = rect.left + html.scrollLeft + "px";
                helpers.setStyleProperty("top", newTop, el);
                helpers.setStyleProperty("left", newLeft, el);
                helpers.setStyleProperty("height", rect.height + "px", el);
                helpers.setStyleProperty("width", rect.width + "px", el);
                helpers.setStyleProperty("transition", "none", el);
                return elInfo;
            });
        },
        disableZoom() {
            inZoom = false;
            zoomLevel = 0;
            html.removeAttribute("in-zoom");
            html.removeAttribute("no-events");
            if (storage.useScreenshot || inFullscreenZoom)
                return;
            html.setAttribute("style", docStyle);
            helpers.resetElementsStyle(fixedElements);
        },
        scale(e) {
            const started = !zoomLevel;
            const zoomType = -Math.sign(e.deltaY);
            const strength = zoomType * helpers.getStrength(storage.strength);
            const divisor = zoomLevel + strength < 0 ? 10 : 1;
            zoomLevel = Math.max(-0.9, zoomLevel + strength / divisor);
            this.transformOrigin(e, zoomType, started);
            helpers.setStyleProperty("transform", `scale(${1 + zoomLevel})`);
        },
        transformOrigin(e, zoomType, started) {
            const useClient = storage.useScreenshot || inFullscreenZoom;
            let [x, y] = useClient ? [e.clientX, e.clientY] : [e.pageX, e.pageY];
            let transition = `transform ${storage.transition}ms`;
            if (!storage.followCursor) {
                const { scrollLeft, scrollTop, clientWidth, clientHeight } = targetEl;
                if (zoomLevel < 0) {
                    x = scrollLeft + clientWidth / 2;
                    y = scrollTop + clientHeight / 2;
                }
                else if (!started) {
                    const [lastX, lastY] = [lastZoomOrigin.x, lastZoomOrigin.y];
                    x = lastX - ((lastX - x) / (1 + zoomLevel ** 2)) * zoomType;
                    y = lastY - ((lastY - y) / (1 + zoomLevel ** 2)) * zoomType;
                    const right = scrollLeft + clientWidth;
                    const bottom = scrollTop + clientHeight;
                    x = Math.max(scrollLeft - 3, Math.min(x, right + 3));
                    y = Math.max(scrollTop - 3, Math.min(y, bottom + 3));
                    transition += `, transform-origin ${storage.transition}ms`;
                }
                lastZoomOrigin = { x, y };
            }
            helpers.setStyleProperty("transition", zoomType ? transition : "none");
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
                const transition = `transform ${storage.transition}ms`;
                helpers.setStyleProperty("transition", transition);
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
                yield utils.switchToFullscreenEl(html); // This "eats" the first event
                if (storage.useScreenshot)
                    return;
                const ancestors = [fullscreenEl, ...utils.getAncestors(fullscreenEl)];
                fullscreenElAncestors = ancestors.map((el) => {
                    const temp = { el, style: el.getAttribute("style") || "" };
                    if (el != fullscreenEl)
                        helpers.disableContainingBlock(el);
                    return temp;
                });
                helpers.setTargetEl(fullscreenEl);
            });
        },
        removeFullscreenZoom() {
            return __awaiter(this, void 0, void 0, function* () {
                inFullscreenZoom = false;
                yield utils.switchToFullscreenEl(fullscreenEl); // New event is required to allow this action
                if (storage.useScreenshot)
                    return;
                helpers.resetElementsStyle(fullscreenElAncestors);
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
            if (inFullscreenZoom)
                this.setStyleProperty("background", "black");
        },
        setStyleProperty(key, value, el) {
            (el || targetEl).style.setProperty(key, value, "important");
        },
        disableContainingBlock(el) {
            this.setStyleProperty("filter", "none", el);
            this.setStyleProperty("transform", "none", el);
            this.setStyleProperty("backdrop-filter", "none", el);
            this.setStyleProperty("perspective", "none", el);
            this.setStyleProperty("contain", "none", el);
            this.setStyleProperty("transform-style", "initial", el);
            this.setStyleProperty("content-visibility", "initial", el);
            this.setStyleProperty("will-change", "initial", el);
        },
        resetElementsStyle(elements) {
            elements.forEach(({ el, style }) => el.setAttribute("style", style));
        },
        updateStorage(key, value) {
            storage[key] = value;
        },
    };
    const utils = {
        sleep(ms) {
            return new Promise((resolve) => setTimeout(resolve, ms));
        },
        getAncestors: function* getAncestors(el) {
            while ((el = el.parentElement))
                yield el;
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
        switchToFullscreenEl(el) {
            return __awaiter(this, void 0, void 0, function* () {
                /* https://stackoverflow.com/questions/71637367/requestfullscreen-not-working-with-modifier-keys-inside-keyup-event */
                try {
                    yield document.exitFullscreen();
                }
                catch (_a) { }
                try {
                    el.requestFullscreen();
                }
                catch (_b) { }
            });
        },
    };
    chrome.storage.sync.get(null, (response) => {
        storage = Object.assign(Object.assign({}, storage), response);
    });
    chrome.storage.onChanged.addListener((changes) => {
        for (const key of Object.keys(changes))
            helpers.updateStorage(key, changes[key].newValue);
    });
    const options = { passive: false, capture: true };
    window.addEventListener("wheel", listeners.onWheel, options);
    window.addEventListener("mousemove", listeners.onMousemove);
    window.addEventListener("mousedown", listeners.onMousedown);
    window.addEventListener("mouseup", listeners.onMouseup);
    window.addEventListener("contextmenu", listeners.onContextmenu, true);
    window.addEventListener("keyup", listeners.onKeyup, true);
    window.addEventListener("scroll", listeners.onScroll);
})();
