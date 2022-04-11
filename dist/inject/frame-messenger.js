"use strict";
/* "run_at": "document_start" is removed because window
listeners don't get registered on dynamically created frames. */
if (window.self != window.top)
    run();
function run() {
    /* setInterval(() => document.body.innerHTML = "", 1000) */
    let state = {
        inZoom: false,
        isPreparingZoom: false,
        isExitingZoom: false,
        isRightClickPressed: false,
    };
    const framePosition = { x: -1, y: -1 };
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
            const customEvent = utils.pick(e, [
                "altKey",
                "ctrlKey",
                "shiftKey",
                "deltaY",
                "clientX",
                "clientY",
            ]);
            messenger.createMessage("onWheel", customEvent);
        },
        onMousemove(e) {
            if (!state.inZoom || state.isExitingZoom || !storage.alwaysFollowCursor)
                return;
            // nosonar throttle = true; setTimeout(() => (throttle = false), 10);
            const customEvent = utils.pick(e, ["clientX", "clientY"]);
            messenger.createMessage("onMousemove", customEvent);
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
    const messenger = {
        createMessage(listener, event) {
            event.isFrameEvent = true;
            this.propagateUp({ data: { listener, event } });
        },
        propagateUp({ data, source }) {
            if (source && ["onWheel", "onMousemove"].includes(data.listener)) {
                if (framePosition.x == -1)
                    for (const frame of document.querySelectorAll("frame, iframe"))
                        if (frame.contentWindow == source) {
                            const style = getComputedStyle(frame);
                            const { x, y } = frame.getBoundingClientRect();
                            framePosition.x = x + (parseFloat(style.borderLeftWidth) || 0);
                            framePosition.y = y + (parseFloat(style.borderTopWidth) || 0);
                            break;
                        }
                data.event.clientX += framePosition.x;
                data.event.clientY += framePosition.y;
            }
            window.parent.postMessage(data, "*");
        },
        propagateDown(newState) {
            state = newState;
            framePosition.x = -1;
            for (const frame of document.querySelectorAll("frame, iframe")) {
                const { contentWindow } = frame;
                if (contentWindow)
                    contentWindow.postMessage(newState, "*");
            }
        },
        onMessage(e) {
            if (e.data.listener != undefined)
                messenger.propagateUp(e);
            else if (e.data.inZoom != undefined)
                messenger.propagateDown(e.data);
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
    /* Listeners Registration */
    const options = { passive: false, capture: true };
    window.addEventListener("wheel", listeners.onWheel, options);
    window.addEventListener("mousemove", listeners.onMousemove);
    window.addEventListener("mousedown", listeners.onMousedown);
    window.addEventListener("mouseup", listeners.onMouseup);
    window.addEventListener("contextmenu", listeners.onContextmenu, true);
    window.addEventListener("keyup", listeners.onKeyup, true);
    window.addEventListener("message", messenger.onMessage);
}
