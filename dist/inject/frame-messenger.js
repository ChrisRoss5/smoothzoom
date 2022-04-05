"use strict";
if (window != window.top)
    contentScript();
const thisFrameId = (window.customFrameId = Math.random());
function contentScript() {
    let state = {
        inZoom: false,
        isPreparingZoom: false,
        isExitingZoom: false,
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
            messenger.createMessage("onWheel", utils.pick(e, [
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
            messenger.createMessage("onMousemove", utils.pick(e, ["clientX", "clientY"]));
        },
        onMousedown(e) {
            messenger.createMessage("onMousedown", { button: e.button });
        },
        onMouseup(e) {
            messenger.createMessage("onMouseup", { button: e.button });
        },
        onContextmenu(e) {
            if (storage.activationKey == "rightClick")
                listeners.stopEvent(e);
        },
        onKeyup(e) {
            if (!helpers.isZoomOver(e))
                return;
            listeners.stopEvent(e);
            messenger.createMessage("onKeyup", { key: e.key });
        },
        stopEvent(e, force) {
            const { inZoom, isPreparingZoom, isExitingZoom } = state;
            if (inZoom || isPreparingZoom || isExitingZoom || force) {
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
            for (const k of paths)
                ret[k] = obj[k];
            return ret;
        },
    };
    const messenger = {
        createMessage(listener, event) {
            event.isCustomEvent = true;
            this.propagateUp({ listener, event }, true);
        },
        propagateUp(messageData, created) {
            /* Shared code begin */
            if (!created && ["onWheel", "onMousemove"].includes(messageData.listener))
                for (const frame of document.querySelectorAll("frame, iframe"))
                    if (frame.contentWindow.customFrameId == messageData.frameId) {
                        const { x, y } = frame.getBoundingClientRect();
                        messageData.event.clientX += x;
                        messageData.event.clientY += y;
                        break;
                    }
            /* Shared code end */
            messageData.frameId = thisFrameId;
            window.parent.postMessage(messageData);
        },
        propagateDown(newState) {
            state = newState;
            for (const frame of document.querySelectorAll("frame, iframe")) {
                const { contentWindow } = frame;
                if (contentWindow)
                    contentWindow.postMessage(newState);
            }
        },
        onMessage(e) {
            if ("listener" in e.data)
                messenger.propagateUp(e.data);
            else if ("inZoom" in e.data)
                messenger.propagateDown(e.data);
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
