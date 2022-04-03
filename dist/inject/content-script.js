"use strict";
/* Created with Typescript & SCSS by Kristijan Rosandić */
/* For testing: http://motherfuckingwebsite.com/ */
(() => {
    const html = document.documentElement;
    let docStyle;
    let targetEl = html;
    let zoomLevel = 0;
    let lastZoomOrigin = { x: 0, y: 0 };
    let inZoom = false;
    let isPreparingZoom = false;
    let isExitingZoom = false;
    let isRightClickPressed = false;
    let isDoubleClick = false;
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
    /* Storage */
    let storage = {
        activationKey: "rightClick",
        holdToZoom: true,
        alwaysFollowCursor: true,
        disableInteractivity: false,
        disableJavascript: false,
        useScreenshot: false,
        strength: 0.5,
        transition: 200,
    };
    chrome.storage.sync.get(null, (response) => {
        storage = Object.assign(Object.assign({}, storage), response);
    });
    chrome.storage.onChanged.addListener((changes) => {
        for (const key of Object.keys(changes))
            helpers.updateStorage(key, changes[key].newValue);
    });
    /* Functions */
    const listeners = {
        async onWheel(e) {
            if (!(helpers.isZoomReady(e) || inZoom))
                return;
            listeners.stopEvent(e, true);
            if (isPreparingZoom || isExitingZoom)
                return;
            if (!inZoom)
                await control.prepareZoom();
            control.scale(e);
        },
        onMousemove(e) {
            if (!inZoom || isExitingZoom || !storage.alwaysFollowCursor)
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
            if (storage.activationKey == "rightClick")
                listeners.stopEvent(e);
        },
        async onKeyup(e) {
            if (!helpers.isZoomOver(e))
                return;
            listeners.stopEvent(e);
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
        onStopZoom() {
            isDoubleClick = true;
            control
                .exitZoom()
                .then(() => window.dispatchEvent(new Event("zoom-stopped")));
        },
        onMessage(e) {
            if (!e.data.isCustomEvent)
                return;
            const frameElement = e.source;
            console.log(frameElement);
        },
        stopEvent(e, force) {
            if ("isCustomEvent" in e)
                return;
            if (inZoom || isPreparingZoom || isExitingZoom || force) {
                e.stopPropagation();
                e.stopImmediatePropagation();
                e.preventDefault();
            }
        },
    };
    const control = {
        async prepareZoom() {
            isPreparingZoom = true;
            if (storage.disableJavascript)
                await control.toggleJavascript(false);
            if (storage.useScreenshot)
                await control.createScreenshot();
            fullscreenEl = document.fullscreenElement;
            if (fullscreenEl && fullscreenEl != html)
                await control.setFullscreenZoom();
            control.enableZoom();
            isPreparingZoom = false;
        },
        enableZoom() {
            inZoom = true;
            if (storage.disableInteractivity)
                html.setAttribute("no-events", "");
            if (storage.useScreenshot || inFullscreenZoom)
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
            html.removeAttribute("no-events");
            if (storage.useScreenshot || inFullscreenZoom)
                return;
            html.setAttribute("style", docStyle);
            html.removeAttribute("in-zoom");
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
            if (!storage.alwaysFollowCursor) {
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
        async exitZoom() {
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
                await control.removeFullscreenZoom();
            else
                await utils.sleep(storage.transition);
            if (storage.disableJavascript)
                await control.toggleJavascript(true);
            control.disableZoom();
            if (storage.useScreenshot)
                targetEl.remove();
            targetEl = html;
            isExitingZoom = false;
        },
        async setFullscreenZoom() {
            inFullscreenZoom = true;
            await utils.switchToFullscreenEl(html); // This "eats" the first event
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
        },
        async removeFullscreenZoom() {
            inFullscreenZoom = false;
            await utils.switchToFullscreenEl(fullscreenEl); // New event is required to allow this action
            if (storage.useScreenshot)
                return;
            helpers.resetElementsStyle(fullscreenElAncestors);
        },
        createScreenshot() {
            return new Promise((resolve) => {
                const request = { message: "TAKE_SCREENSHOT" };
                chrome.runtime.sendMessage(request, (dataUrl) => {
                    const img = document.createElement("img");
                    helpers.setTargetEl(html.appendChild(img));
                    img.onload = resolve;
                    img.src = dataUrl;
                });
            });
        },
        toggleJavascript(enable) {
            return new Promise((resolve) => {
                const request = {
                    message: "TOGGLE_JAVASCRIPT",
                    details: { enable, primaryPattern: location.origin + "/*" },
                };
                chrome.runtime.sendMessage(request, resolve);
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
        async switchToFullscreenEl(el) {
            /* https://stackoverflow.com/questions/71637367/requestfullscreen-not-working-with-modifier-keys-inside-keyup-event */
            try {
                await document.exitFullscreen();
            }
            catch (_a) { }
            try {
                el.requestFullscreen();
            }
            catch (_b) { }
        },
    };
    const options = { passive: false, capture: true };
    window.addEventListener("wheel", listeners.onWheel, options);
    window.addEventListener("mousemove", listeners.onMousemove);
    window.addEventListener("mousedown", listeners.onMousedown);
    window.addEventListener("mouseup", listeners.onMouseup);
    window.addEventListener("contextmenu", listeners.onContextmenu, true);
    window.addEventListener("keyup", listeners.onKeyup, true);
    window.addEventListener("scroll", listeners.onScroll);
    window.addEventListener("stop-zoom", listeners.onStopZoom);
    window.addEventListener("message", listeners.onMessage);
})();
