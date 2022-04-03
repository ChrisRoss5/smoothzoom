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
if (window.parent != window)
    contentScript();
function contentScript() {
    /*   const state = {
    inZoom: false,
    isPreparingZoom: false,
    isExitingZoom: false,
    isRightClickPressed: false,
    isDoubleClick: false,
      } */
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
    const messenger = {
        bubble(message) {
            window.parent.postMessage(message);
        },
        capture(message) {
        }
    };
    const listeners = {
        onWheel(e) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!(helpers.isZoomReady(e) || inZoom))
                    return;
                listeners.stopEvent(e, true);
                if (isPreparingZoom || isExitingZoom)
                    return;
                if (!inZoom)
                    yield control.prepareZoom();
                control.scale(e);
            });
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
        onKeyup(e) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!helpers.isZoomOver(e))
                    return;
                listeners.stopEvent(e);
                if (inZoom)
                    control.exitZoom();
                else if (isPreparingZoom)
                    isDoubleClick = true;
            });
        },
        onStopZoom() {
            isDoubleClick = true;
            control
                .exitZoom()
                .then(() => window.dispatchEvent(new Event("zoom-stopped")));
        },
        onFrameMessage(e) {
            console.log(e);
        },
        stopEvent(e, force) {
            if (inZoom || isPreparingZoom || isExitingZoom || force) {
                e.stopPropagation();
                e.stopImmediatePropagation();
                e.preventDefault();
            }
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
        updateStorage(key, value) {
            storage[key] = value;
        },
    };
    const options = { passive: false, capture: true };
    window.addEventListener("wheel", listeners.onWheel, options);
    window.addEventListener("mousemove", listeners.onMousemove);
    window.addEventListener("mousedown", listeners.onMousedown);
    window.addEventListener("mouseup", listeners.onMouseup);
    window.addEventListener("contextmenu", listeners.onContextmenu, true);
    window.addEventListener("keyup", listeners.onKeyup, true);
    window.addEventListener("stop-zoom", listeners.onStopZoom);
    window.addEventListener("message", listeners.onFrameMessage, false);
}
