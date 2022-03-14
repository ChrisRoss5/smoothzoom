const doc = document.documentElement;
let targetEl = doc;

let storage: ChromeStorage = {
  activationKey: "rightClick",
  websiteInteractivity: true,
  holdToZoom: true,
  useScreenshot: false,
  strength: 1,
  transition: 200
};

let rightClickPressed = false;
let isDoubleClick = false;
let inZoom = false;
let zoomLevel = 0;
let isCreatingScreenshot = false;

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

/* Functions */

async function onWheel(e: WheelEvent) {
  const zoomReady =
    (rightClickPressed && storage.activationKey == "rightClick") ||
    (e.altKey && storage.activationKey == "altKey") ||
    (e.ctrlKey && storage.activationKey == "ctrlKey") ||
    (e.shiftKey && storage.activationKey == "shiftKey");

  if (zoomReady || inZoom) {
    e.preventDefault();
    if (isCreatingScreenshot) return;
    if (!inZoom && storage.useScreenshot) {
      isCreatingScreenshot = true;
      await createScreenshot();
      isCreatingScreenshot = false;
    }
    if (!storage.websiteInteractivity)
      setStyleProperty("pointer-events", "none");
    inZoom = true;
    scale(e);
  }
}

function onMousemove(e: MouseEvent) {
  if (!inZoom) return;
  setStyleProperty("transition", "none");
  transformOrigin(e);
}

function onMousedown(e: MouseEvent) {
  if (e.button == 2) rightClickPressed = true;
}

function onMouseup(e: MouseEvent) {
  if (rightClickPressed && e.button == 2) {
    rightClickPressed = false;

    // Using setTimeout to allow onContextmenu() before inZoom == false;
    if (inZoom && storage.activationKey == "rightClick") setTimeout(removeZoom);
  }
}

function onContextmenu(e: Event) {
  if (inZoom) e.preventDefault();
}

function onKeyup(e: KeyboardEvent) {
  if (!inZoom) return;
  if (
    (e.key == "Alt" && storage.activationKey == "altKey") ||
    (e.key == "Control" && storage.activationKey == "ctrlKey") ||
    (e.key == "Shift" && storage.activationKey == "shiftKey")
  )
    removeZoom();
}

function scale(e: WheelEvent) {
  const zoomType = -Math.sign(e.deltaY) as -1 | 1;
  zoomLevel = Math.max(
    -0.75,
    zoomLevel +
      (zoomType * getStrength(storage.strength)) /
        ((!zoomLevel && zoomType == -1) || zoomLevel < 0 ? 4 : 1)
  );
  setStyleProperty("transition", `transform ${storage.transition}ms`);
  setStyleProperty("transform", `scale(${1 + zoomLevel})`);
  transformOrigin(e);
}

function transformOrigin(e: MouseEvent) {
  const [x, y] = storage.useScreenshot
    ? [e.clientX, e.clientY]
    : [e.pageX, e.pageY];
  setStyleProperty("transform-origin", `${x}px ${y}px`);
}

function removeZoom() {
  if (!storage.holdToZoom && !isDoubleClick) {
    isDoubleClick = true;
    return;
  }
  isDoubleClick = false;
  inZoom = false;
  zoomLevel = 0;
  setStyleProperty("transition", `transform ${storage.transition}ms`);
  setStyleProperty("transform", "none");
  if (!storage.websiteInteractivity) setStyleProperty("pointer-events", "auto");
  if (targetEl.id != "zoom-screenshot") return;
  setTimeout(() => {
    targetEl.remove();
    targetEl = doc;
  }, 100);
}

function createScreenshot() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage("TAKE_SCREENSHOT", (dataUrl: string) => {
      const img = document.createElement("img");
      targetEl = doc.appendChild(img);
      targetEl.id = "zoom-screenshot";
      img.onload = resolve;
      img.src = dataUrl;
    });
  });
}

/* Utils */

function setStyleProperty(key: string, value: string) {
  targetEl.style.setProperty(key, value, "important");
}

function updateStorage<Key extends keyof ChromeStorage>(
  key: Key,
  value: ChromeStorage[Key]
) {
  storage[key] = value;
}

function getStrength(percentage: number) {
  if (percentage < 0.5) return 0.25 + 1.5 * percentage;
  return 1 + 6 * (percentage - 0.5);
}
