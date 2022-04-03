if (window.parent != window) contentScript();

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
  } as DefaultStorage as ChromeStorage;
  chrome.storage.sync.get(null, (response) => {
    storage = { ...storage, ...(response as ChromeStorage) };
  });
  chrome.storage.onChanged.addListener((changes) => {
    for (const key of Object.keys(changes))
      helpers.updateStorage(key as keyof ChromeStorage, changes[key].newValue);
  });

  /* Functions */

  const messenger = {
    bubble(message: any) {
      window.parent.postMessage(message);
    },
    capture(message: any) {

    }
  }

  const listeners = {
    async onWheel(e: WheelEvent) {
      if (!(helpers.isZoomReady(e) || inZoom)) return;
      listeners.stopEvent(e, true);
      if (isPreparingZoom || isExitingZoom) return;
      if (!inZoom) await control.prepareZoom();
      control.scale(e);
    },
    onMousemove(e: MouseEvent) {
      if (!inZoom || isExitingZoom || !storage.alwaysFollowCursor) return;
      control.transformOrigin(e, 0);
    },
    onMousedown(e: MouseEvent) {
      if (e.button == 2) isRightClickPressed = true;
    },
    onMouseup(e: MouseEvent) {
      if (!(isRightClickPressed && e.button == 2)) return;
      isRightClickPressed = false;
      if (storage.activationKey != "rightClick") return;
      // Using setTimeout to allow onContextmenu() before inZoom == false;
      if (inZoom) setTimeout(control.exitZoom);
      else if (isPreparingZoom) isDoubleClick = true;
    },
    onContextmenu(e: Event) {
      if (storage.activationKey == "rightClick") listeners.stopEvent(e);
    },
    async onKeyup(e: KeyboardEvent) {
      if (!helpers.isZoomOver(e)) return;
      listeners.stopEvent(e);
      if (inZoom) control.exitZoom();
      else if (isPreparingZoom) isDoubleClick = true;
    },
    onStopZoom() {
      isDoubleClick = true;
      control
        .exitZoom()
        .then(() => window.dispatchEvent(new Event("zoom-stopped")));
    },
    onFrameMessage(e: MessageEvent) {
      console.log(e);
    },
    stopEvent(e: Event, force?: boolean) {
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
        (isRightClickPressed && storage.activationKey == "rightClick") ||
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