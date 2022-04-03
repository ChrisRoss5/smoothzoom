if (window.parent != window) contentScript();

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
      messenger.propagateUp(
        "wheel",
        utils.pick(e, [
          "altKey",
          "ctrlKey",
          "shiftKey",
          "deltaY",
          "clientX",
          "clientY",
        ])
      );
    },
    onMousemove(e: MouseEvent) {
      if (!state.inZoom || state.isExitingZoom || !storage.alwaysFollowCursor)
        return;
      messenger.propagateUp("mousemove", utils.pick(e, ["clientX", "clientY"]));
    },
    onMousedown(e: MouseEvent) {
      messenger.propagateUp("mousedown", { button: e.button });
    },
    onMouseup(e: MouseEvent) {
      messenger.propagateUp("mouseup", { button: e.button });
    },
    onContextmenu(e: Event) {
      if (storage.activationKey == "rightClick") listeners.stopEvent(e);
    },
    onKeyup(e: KeyboardEvent) {
      if (!helpers.isZoomOver(e)) return;
      listeners.stopEvent(e);
      messenger.propagateUp("keyup", { key: e.key });
    },
    stopEvent(e: Event, force?: boolean) {
      if (Object.values(state).some((x) => x) || force) {
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
  const utils = {
    pick<T extends object, U extends keyof T>(
      obj: T,
      paths: Array<U>
    ): Pick<T, U> {
      const ret = Object.create(null);
      for (const k of paths) {
        ret[k] = obj[k];
      }
      return ret;
    },
  };
  const messenger = {
    propagateUp(
      listener: string,
      event: Partial<MouseEvent | WheelEvent | KeyboardEvent>
    ) {
      (event as any).isCustomEvent = true;
      window.parent.postMessage({ listener, event });
    },
    propagateDown(message: any) {},
    onMessage(message: MessageEvent) {
      console.log(message);

      if (message.data.isCustomEvent) {
        const frameElement = e.source as any;

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
