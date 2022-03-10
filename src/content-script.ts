const doc = document.documentElement;
doc.classList.add("smooth-zoom");

const dot = document.createElement("div");
dot.className = "dot";
doc.appendChild(dot);

let inZoom = false;
let zoomLevel = 0;
let scale = 1;
let lastZoomX = 0;
let lastZoomY = 0;

let activationKey: "rightClick" | "altKey" | "ctrlKey" | "shiftKey";
let rightClickPressed = false;

chrome.storage.local.get(null, (storage) => {
  activationKey = storage.activationKey || "rightClick";
  document.addEventListener("wheel", onWheel, { passive: false });
  document.addEventListener("mousemove", onMousemove);
  document.addEventListener("mousedown", onMousedown);
  document.addEventListener("mouseup", onMouseup);
  document.addEventListener("contextmenu", onContextmenu);
});

function onWheel(e: WheelEvent) {
  if (activationKey == "rightClick" && rightClickPressed) {
    inZoom = true;
  }
  //(e.altKey, e.ctrlKey, e.shiftKey);
  if (inZoom) {
    transform(e);
    e.preventDefault();
  }
}

function onMousemove(e: MouseEvent, zoomed?: boolean) {
  if (!inZoom) return;
  if (!zoomed) doc.style.transition = "none";

  const percFromLastZoomX = e.clientX / lastZoomX;
  const percFromLastZoomX = e.clientY / lastZoomX;


  const percFromClientLeft = (e.clientX / doc.clientWidth) * 100;
  const percFromClientTop = (e.clientY / doc.clientHeight) * 100;
  const widthMultiplier = doc.clientWidth / doc.offsetWidth;
  const heightMultiplier = doc.clientHeight / doc.offsetHeight;
  const zoomDistance = getZoom(zoomLevel) - getZoom(zoomLevel - 1);
  const x = zoomDistance * (50 - percFromClientLeft) * widthMultiplier * lastZoomX;
  const y = zoomDistance * (50 - percFromClientTop) * heightMultiplier * lastZoomX;
  console.log(x, y);

  doc.style.transform = `scale(${scale}) translate(${x}%, ${y}%)`;
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

function removeZoom() {
  inZoom = false;
  zoomLevel = 0;
  doc.style.transition = "transform 100ms";
  doc.style.transform = "none";
}

function transform(e: WheelEvent) {
  const zoomType = Math.sign(e.deltaY) as 1 | -1;
  zoomLevel -= zoomType;
  doc.style.transition = "transform 100ms";

  const zoom = getZoom(zoomLevel);
  console.log("Zoom: " + zoom);
  scale = 1 + zoom;

  const percFromClientLeft = 0.5 - e.clientX / doc.clientWidth;
  const percFromClientTop = 0.5 - e.clientY / doc.clientHeight;
  const percFromPageLeft = 0.5 - e.pageX / doc.offsetWidth;
  const percFromPageTop = 0.5 - e.pageY / doc.offsetHeight;

  lastZoomX = e.clientX / doc.clientWidth;
  lastZoomY = e.clientY / doc.clientHeight;
  doc.style.transformOrigin = `${e.pageX}px ${e.pageY}px`;
  onMousemove(e, true);
}

function getZoom(level: number) {
  if (!level) return 0;
  return Math.max(0.5, /* Math.sqrt(level * 10) / 5 */ level / 2);
}
