"use strict";
if (window.parent != window)
    contentScript();
function contentScript() {
    let state = {
        inZoom: false,
        isExitingZoom: false,
        isPreparingZoom: false,
        isRightClickPressed: false,
    };
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
        onWheel(e) {
            if (!(helpers.isZoomReady(e) || state.inZoom))
                return;
            listeners.stopEvent(e, true);
            messenger.propagateUp("wheel", utils.pick(e, [
                "altKey",
                "ctrlKey",
                "shiftKey",
                "deltaY",
                "clientX",
                "clientY",
            ]));
        },
        onMousemove(e) {
            if (!state.inZoom || state.isExitingZoom || !storage.alwaysFollowCursor)
                return;
            messenger.propagateUp("mousemove", utils.pick(e, ["clientX", "clientY"]));
        },
        onMousedown(e) {
            messenger.propagateUp("mousedown", { button: e.button });
        },
        onMouseup(e) {
            messenger.propagateUp("mouseup", { button: e.button });
        },
        onContextmenu(e) {
            if (storage.activationKey == "rightClick")
                listeners.stopEvent(e);
        },
        onKeyup(e) {
            if (!helpers.isZoomOver(e))
                return;
            listeners.stopEvent(e);
            messenger.propagateUp("keyup", { key: e.key });
        },
        stopEvent(e, force) {
            if (Object.values(state).some((x) => x) || force) {
                e.stopPropagation();
                e.stopImmediatePropagation();
                e.preventDefault();
            }
        },
    };
    const helpers = {
        isZoomReady(e) {
            return ((state.isRightClickPressed && storage.activationKey == "rightClick") ||
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
    const utils = {
        pick(obj, paths) {
            const ret = Object.create(null);
            for (const k of paths) {
                ret[k] = obj[k];
            }
            return ret;
        },
    };
    const messenger = {
        propagateUp(listener, event) {
            event.isCustomEvent = true;
            window.parent.postMessage({ listener, event });
        },
        propagateDown(message) { },
        onMessage(message) {
            console.log(message);
            if (message.data.isCustomEvent) {
                const frameElement = e.source;
                //this.propagateUp();
            }
        },
    };
    const options = { passive: false, capture: true };
    window.addEventListener("wheel", listeners.onWheel, options);
    window.addEventListener("mousemove", listeners.onMousemove);
    window.addEventListener("mousedown", listeners.onMousedown);
    window.addEventListener("mouseup", listeners.onMouseup);
    window.addEventListener("contextmenu", listeners.onContextmenu, true);
    window.addEventListener("keyup", listeners.onKeyup, true);
    window.addEventListener("message", messenger.onMessage);
}
