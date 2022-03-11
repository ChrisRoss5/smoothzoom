/* https://developer.chrome.com/docs/extensions/reference/tabCapture */
/* https://html2canvas.hertzen.com/ */

// TABCAPTURE IS BROKEN -- using html2canvas as alternative
// chrome.tabCapture.capture({ audio: false, video: false }, (callback) => {
//   console.log(callback);
// });

type ActivationKey = "rightClick" | "altKey" | "ctrlKey" | "shiftKey";
interface ChromeStorage {
  activationKey: ActivationKey;
  useCanvas: boolean;
}

const doc = document.documentElement;
let targetEl = doc;
let activationKey: ActivationKey;
let rightClickPressed = false;
let inZoom = false;
let zoomLevel = 0;
let useCanvas = false;
let isRenderingCanvas = false;

chrome.storage.local.get(null, (response) => {
  const storage = response as ChromeStorage;
  activationKey = storage.activationKey || "rightClick";

  if (storage.useCanvas)
    chrome.runtime.sendMessage("useCanvas", () => (useCanvas = true));

  document.addEventListener("wheel", onWheel, { passive: false });
  document.addEventListener("mousemove", onMousemove);
  document.addEventListener("mousedown", onMousedown);
  document.addEventListener("mouseup", onMouseup);
  document.addEventListener("contextmenu", onContextmenu);
});

function onWheel(e: WheelEvent) {
  const _inZoom =
    (rightClickPressed && activationKey == "rightClick") ||
    (e.altKey && activationKey == "altKey") ||
    (e.ctrlKey && activationKey == "ctrlKey") ||
    (e.shiftKey && activationKey == "shiftKey");

  if (_inZoom) {
    e.preventDefault();
    if (isRenderingCanvas) return;
    if (!inZoom && useCanvas) {
      isRenderingCanvas = true;
      createCanvas().then(() => {
        isRenderingCanvas = false;
        inZoom = true;
        scale(e);
      });
    } else {
      inZoom = true;
      scale(e);
    }
  }
}

function onMousemove(e: MouseEvent, zoomed?: boolean) {
  if (!inZoom) return;
  targetEl.style.transition = "none";
  transformOrigin(e);
}

function onMousedown(e: MouseEvent) {
  if (e.button == 2) rightClickPressed = true;
}

function onMouseup(e: MouseEvent) {
  if (rightClickPressed && e.button == 2) {
    rightClickPressed = false;
    if (inZoom && activationKey == "rightClick") setTimeout(removeZoom);
  }
}

function onContextmenu(e: Event) {
  if (inZoom) e.preventDefault();
}

function scale(e: WheelEvent) {
  zoomLevel = Math.max(0, zoomLevel - Math.sign(e.deltaY));
  targetEl.style.transition = "transform 100ms";
  targetEl.style.transform = `scale(${1 + zoomLevel})`;
  transformOrigin(e);
}

function transformOrigin(e: MouseEvent) {
  const [x, y] = useCanvas ? [e.clientX, e.clientY] : [e.pageX, e.pageY];
  targetEl.style.transformOrigin = `${x}px ${y}px`;
}

function removeZoom() {
  inZoom = false;
  zoomLevel = 0;
  targetEl.style.transition = "transform 100ms";
  targetEl.style.transform = "none";
  if (!useCanvas) return;
  setTimeout(() => {
    targetEl.remove();
    targetEl = doc;
  }, 100);
}

function createCanvas() {
  return new Promise<void>((resolve) => {
    (window as any)
      .html2canvas(doc, {
        x: window.scrollX,
        y: window.scrollY,
        width: window.innerWidth,
        height: window.innerHeight,
      })
      .then((canvas: HTMLCanvasElement) => {
        targetEl = doc.appendChild(canvas);
        targetEl.className = "zoom-canvas";
        targetEl.offsetHeight; // NOSONAR -> reflow for transition
        resolve();
      });
  });
}
