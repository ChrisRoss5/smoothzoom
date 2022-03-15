const doc = document.documentElement;
let targetEl = doc;
let storage: ChromeStorage = {
  activationKey: "rightClick",
  websiteInteractivity: true,
  holdToZoom: true,
  useScreenshot: false,
  strength: 1,
  transition: 200,
};
let zoomLevel = 0;
let inZoom = false;
let isRightClickPressed = false;
let isDoubleClick = false;
let isCreatingScreenshot = false;

// Fullscreen problems
let inFullscreenZoom = false;
let fullscreenEl: HTMLElement;

chrome.storage.sync.get(null, (response) => {
  storage = { ...storage, ...(response as ChromeStorage) };
  document.addEventListener("wheel", onWheel, { passive: false });
  document.addEventListener("mousemove", onMousemove);
  document.addEventListener("mousedown", onMousedown);
  document.addEventListener("mouseup", onMouseup);
  document.addEventListener("contextmenu", onContextmenu);
  document.addEventListener("keyup", onKeyup);
});

chrome.storage.onChanged.addListener((changes) => {
  for (const key of Object.keys(changes))
    updateStorage(key as keyof ChromeStorage, changes[key].newValue);
});

/* Listeners */

async function onWheel(e: WheelEvent) {
  if (!isZoomReady(e) && !inZoom) return;
  e.preventDefault();

  // Screenshot
  if (isCreatingScreenshot) return;
  if (!inZoom && storage.useScreenshot) {
    isCreatingScreenshot = true;
    await createScreenshot();
    isCreatingScreenshot = false;
  }

  // Website interactivity
  if (!storage.websiteInteractivity) setStyleProperty("pointer-events", "none");

  // Fullscreen problems
  if (!inFullscreenZoom) {
    fullscreenEl = document.fullscreenElement as HTMLElement;
    if (fullscreenEl) await setFullscreenZoom();
  }

  inZoom = true;
  scale(e);
}

function onMousemove(e: MouseEvent) {
  if (!inZoom) return;
  setStyleProperty("transition", "none");
  transformOrigin(e);
}

function onMousedown(e: MouseEvent) {
  if (e.button == 2) isRightClickPressed = true;
}

function onMouseup(e: MouseEvent) {
  if (isRightClickPressed && e.button == 2) {
    isRightClickPressed = false;

    // Using setTimeout to allow onContextmenu() before inZoom == false;
    if (inZoom && storage.activationKey == "rightClick") setTimeout(removeZoom);
  }
}

function onContextmenu(e: Event) {
  if (inZoom) e.preventDefault();
}

function onKeyup(e: KeyboardEvent) {
  if (inZoom && isZoomOver(e)) removeZoom();
}

/* Control */

function scale(e: WheelEvent) {
  const zoomType = -Math.sign(e.deltaY) as -1 | 1;
  const strength = zoomType * getStrength(storage.strength);
  const easeIn = (zoomType == -1 && !zoomLevel) || zoomLevel < 0;
  zoomLevel = Math.max(-0.9, zoomLevel + strength / (easeIn ? 4 : 1));
  setStyleProperty("transition", `transform ${storage.transition}ms`);
  setStyleProperty("transform", `scale(${1 + zoomLevel})`);
  transformOrigin(e);
}

function transformOrigin(e: MouseEvent) {
  const [x, y] =
    storage.useScreenshot || inFullscreenZoom
      ? [e.clientX, e.clientY]
      : [e.pageX, e.pageY];
  setStyleProperty("transform-origin", `${x}px ${y}px`);
}

function removeZoom() {
  if (!isDoubleClick && (!storage.holdToZoom || inFullscreenZoom)) {
    isDoubleClick = true;
    return;
  }
  isDoubleClick = false;

  zoomLevel = 0;
  inZoom = false;
  setStyleProperty("transition", `transform ${storage.transition}ms`);
  setStyleProperty("transform", "none");
  if (!storage.websiteInteractivity) setStyleProperty("pointer-events", "auto");

  // Fullscreen problems
  if (inFullscreenZoom) {
    inFullscreenZoom = false;
    document.exitFullscreen().then(() => {
      if (storage.useScreenshot) targetEl.remove();
      else targetEl.removeAttribute("zoom-topmost");
      fullscreenEl.requestFullscreen(); // New event is required to allow this action
      targetEl = doc;
    });
    return;
  }

  // Screenshot
  if (targetEl.hasAttribute("zoom-topmost")) {
    setTimeout(() => {
      targetEl.remove();
      targetEl = doc;
    }, storage.transition);
  }
}

async function setFullscreenZoom() {
  inFullscreenZoom = true;
  await document.exitFullscreen();
  doc.requestFullscreen();  // This "eats" the first event
  if (!storage.useScreenshot) setNewTargetEl(fullscreenEl);
}

function createScreenshot() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage("TAKE_SCREENSHOT", (dataUrl: string) => {
      const img = document.createElement("img");
      setNewTargetEl(doc.appendChild(img));
      img.onload = resolve;
      img.src = dataUrl;
    });
  });
}

/* Helpers */

function isZoomReady(e: WheelEvent) {
  return (
    (isRightClickPressed && storage.activationKey == "rightClick") ||
    (e.altKey && storage.activationKey == "altKey") ||
    (e.ctrlKey && storage.activationKey == "ctrlKey") ||
    (e.shiftKey && storage.activationKey == "shiftKey")
  );
}

function isZoomOver(e: KeyboardEvent) {
  return (
    (e.key == "Alt" && storage.activationKey == "altKey") ||
    (e.key == "Control" && storage.activationKey == "ctrlKey") ||
    (e.key == "Shift" && storage.activationKey == "shiftKey")
  );
}

function setNewTargetEl(el: HTMLElement) {
  targetEl = el;
  targetEl.setAttribute("zoom-topmost", "");
}

function setStyleProperty(key: string, value: string) {
  targetEl.style.setProperty(key, value, "important");
}

function getStrength(percentage: number) {
  if (percentage < 0.5) return 0.25 + 1.5 * percentage;
  return 1 + 6 * (percentage - 0.5);
}

function updateStorage<Key extends keyof ChromeStorage>(
  key: Key,
  value: ChromeStorage[Key]
) {
  storage[key] = value;
}
