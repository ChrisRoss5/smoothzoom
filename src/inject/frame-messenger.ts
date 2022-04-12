/* "run_at": "document_start" is removed because window
listeners don't get registered on dynamically created frames. */

if (window.self != window.top) run();

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
  } as DefaultStorage as ChromeStorage;
  chrome.storage.sync.get(null, (response) => {
    storage = { ...storage, ...(response as ChromeStorage) };
  });
  chrome.storage.onChanged.addListener((changes) => {
    for (const key of Object.keys(changes))
      helpers.updateStorage(key as keyof ChromeStorage, changes[key].newValue);
  });

  /* Functions */

  const listeners = {
    onWheel(e: WheelEvent) {
      if (!(helpers.isZoomReady(e) || state.inZoom)) return;
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
    onMousemove(e: MouseEvent) {
      if (!state.inZoom || state.isExitingZoom || !storage.alwaysFollowCursor)
        return;
      // nosonar throttle = true; setTimeout(() => (throttle = false), 10);
      const customEvent = utils.pick(e, ["clientX", "clientY"]);
      messenger.createMessage("onMousemove", customEvent);
    },
    onMousedown(e: MouseEvent) {
      messenger.createMessage("onMousedown", { button: e.button });
    },
    onMouseup(e: MouseEvent) {
      messenger.createMessage("onMouseup", { button: e.button });
    },
    onContextmenu(e: Event) {
      if (storage.activationKey == "rightClick") listeners.stopEvent(e);
    },
    onKeyup(e: KeyboardEvent) {
      if (!helpers.isZoomOver(e)) return;
      listeners.stopEvent(e);
      messenger.createMessage("onKeyup", { key: e.key });
    },
    stopEvent(e: Event, force?: boolean) {
      const { inZoom, isPreparingZoom, isExitingZoom } = state;
      if (inZoom || isPreparingZoom || isExitingZoom || force) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
  };
  const helpers = {
    isZoomReady(e: WheelEvent) {
      return (
        (state.isRightClickPressed && storage.activationKey == "rightClick") ||
        (e.altKey && storage.activationKey == "altKey") ||
        (e.ctrlKey && storage.activationKey == "ctrlKey") ||
        (e.shiftKey && storage.activationKey == "shiftKey")
      );
    },
    isZoomOver(e: KeyboardEvent) {
      return (
        (e.key == "Alt" && storage.activationKey == "altKey") ||
        (e.key == "Control" && storage.activationKey == "ctrlKey") ||
        (e.key == "Shift" && storage.activationKey == "shiftKey")
      );
    },
    updateStorage<Key extends keyof ChromeStorage>(
      key: Key,
      value: ChromeStorage[Key]
    ) {
      storage[key] = value;
    },
  };
  const messenger = {
    createMessage(listener: MessageData["listener"], event: any) {
      event.isFrameEvent = true;
      this.propagateUp({ data: { listener, event } });
    },
    propagateUp({ data, source }: { data: MessageData; source?: WindowProxy }) {
      if (source && /onWheel|onMousemove/.test(data.listener)) {
        if (framePosition.x == -1)
          for (const frame of document.querySelectorAll("frame, iframe"))
            if ((frame as any).contentWindow == source) {
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
    propagateDown(newState: typeof state) {
      state = newState;
      framePosition.x = -1;
      for (const frame of document.querySelectorAll("frame, iframe")) {
        const { contentWindow } = frame as HTMLIFrameElement;
        if (contentWindow) contentWindow.postMessage(newState, "*");
      }
    },
    onMessage(e: MessageEvent) {
      if (e.data.listener != undefined) messenger.propagateUp(e as any);
      else if (e.data.inZoom != undefined) messenger.propagateDown(e.data);
    },
  };
  const utils = {
    pick<T extends object, U extends keyof T>(
      obj: T,
      paths: Array<U>
    ): Pick<T, U> {
      const ret = Object.create(null);
      for (const k of paths) ret[k] = obj[k];
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
