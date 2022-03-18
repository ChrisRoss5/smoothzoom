const doc = document.documentElement;
let docStyle: string;
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
let isExitingZoom = false;
let isRightClickPressed = false;

// Fullscreen problem
let inFullscreenZoom = false;
let fullscreenEl: HTMLElement;
let fullscreenElParent: HTMLElement;
let fullscreenElIdx: number;
let fullscreenElStyle: string;
/*
 * Possible solution #2: Instead of changing fullscreenEl position in DOM, all
 * its ancestors need to have the highest specificity style which defines values:
 * filter, transform, backdrop-filter, perspective, contain,
 * transform-style, content-visibility, and will-change as none.
 */

// Elements with position "fixed" problem
let fixedElsMapped: { el: HTMLElement; style: string }[] = [];
/*
 * Previous solution (slow): [...doc.getElementsByTagName("*")].filter((el) =>
 * getComputedStyle(el).position == "fixed");
 */

/* --- */

const listeners = {
  isCreatingScreenshot: false,
  async onWheel(e: WheelEvent) {
    if (!(helpers.isZoomReady(e) || inZoom)) return;
    e.preventDefault();
    if (this.isCreatingScreenshot || isExitingZoom) return;
    if (!inZoom) {
      if (storage.useScreenshot) {
        this.isCreatingScreenshot = true;
        await control.createScreenshot();
        this.isCreatingScreenshot = false;
      }
      helpers.enableZoom();
    }
    if (!inFullscreenZoom) {
      fullscreenEl = document.fullscreenElement as HTMLElement;
      if (fullscreenEl && fullscreenEl != doc)
        await control.setFullscreenZoom();
    }
    control.scale(e);
  },
  onMousemove(e: MouseEvent) {
    if (!inZoom || isExitingZoom) return;
    helpers.setStyleProperty("transition", "none");
    control.transformOrigin(e);
  },
  onMousedown(e: MouseEvent) {
    if (e.button == 2) isRightClickPressed = true;
  },
  onMouseup(e: MouseEvent) {
    if (isRightClickPressed && e.button == 2) {
      isRightClickPressed = false;
      if (inZoom && storage.activationKey == "rightClick")
        // Using setTimeout to allow onContextmenu() before inZoom == false;
        setTimeout(control.exitZoom);
    }
  },
  onContextmenu(e: Event) {
    if (inZoom) e.preventDefault();
  },
  onKeyup(e: KeyboardEvent) {
    if (inZoom && helpers.isZoomOver(e)) control.exitZoom();
  },
};
const control = {
  scale(e: WheelEvent) {
    const zoomType = -Math.sign(e.deltaY) as -1 | 1;
    const strength = zoomType * helpers.getStrength(storage.strength);
    const easeIn = (zoomType == -1 && !zoomLevel) || zoomLevel < 0;
    zoomLevel = Math.max(-0.9, zoomLevel + strength / (easeIn ? 4 : 1));
    helpers.setStyleProperty("transition", `transform ${storage.transition}ms`);
    helpers.setStyleProperty("transform", `scale(${1 + zoomLevel})`);
    this.transformOrigin(e);
  },
  transformOrigin(e: MouseEvent) {
    const useClient = storage.useScreenshot || inFullscreenZoom;
    const [x, y] = useClient ? [e.clientX, e.clientY] : [e.pageX, e.pageY];
    helpers.setStyleProperty("transform-origin", `${x}px ${y}px`);
  },
  isDoubleClick: false,
  async exitZoom() {
    if (!this.isDoubleClick && (!storage.holdToZoom || inFullscreenZoom)) {
      this.isDoubleClick = true;
      return;
    }
    this.isDoubleClick = false;
    isExitingZoom = true;
    helpers.setStyleProperty("transition", `transform ${storage.transition}ms`);
    helpers.setStyleProperty("transform", "none");
    if (inFullscreenZoom) await control.removeFullscreenZoom();
    else await utils.sleep(storage.transition);
    helpers.disableZoom();
    if (storage.useScreenshot) targetEl.remove();
    targetEl = doc;
    isExitingZoom = false;
  },
  async setFullscreenZoom() {
    inFullscreenZoom = true;
    await document.exitFullscreen();
    doc.requestFullscreen(); // This "eats" the first event
    if (storage.useScreenshot) return;
    fullscreenElStyle = fullscreenEl.getAttribute("style") || "";
    fullscreenElParent = fullscreenEl.parentElement!;
    fullscreenElIdx = utils.getChildIndex(fullscreenEl);
    helpers.setTargetEl(doc.appendChild(fullscreenEl));
  },
  async removeFullscreenZoom() {
    inFullscreenZoom = false;
    await document.exitFullscreen();
    fullscreenEl.requestFullscreen(); // New event is required to allow this action
    if (storage.useScreenshot) return;
    targetEl.setAttribute("style", fullscreenElStyle);
    utils.insertChild(fullscreenElParent, fullscreenEl, fullscreenElIdx);
  },
  createScreenshot() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage("TAKE_SCREENSHOT", (dataUrl: string) => {
        const img = document.createElement("img");
        helpers.setTargetEl(doc.appendChild(img));
        img.onload = resolve;
        img.src = dataUrl;
      });
    });
  },
};
const helpers = {
  enableZoom() {
    inZoom = true;
    docStyle = doc.getAttribute("style") || "";
    this.setStyleProperty("width", "100vw");
    this.setStyleProperty("height", "100vh");
    this.setStyleProperty("overflow", "hidden");
    if (!storage.websiteInteractivity)
      this.setStyleProperty("pointer-events", "none");
    if (storage.useScreenshot) return;
    doc.setAttribute("in-zoom", doc.scrollTop + "px");
    this.setStyleProperty("--zoom-top", doc.scrollTop + "px");
    this.setStyleProperty("--zoom-left", doc.scrollLeft + "px");
    fixedElsMapped = utils.getFixedElements().map((el) => {
      const elInfo = { el, style: el.getAttribute("style") || "" };
      const rect = el.getBoundingClientRect();
      this.setStyleProperty("top", rect.top + doc.scrollTop + "px", el);
      this.setStyleProperty("left", rect.left + doc.scrollLeft + "px", el);
      this.setStyleProperty("height", rect.height + "px", el);
      this.setStyleProperty("width", rect.width + "px", el);
      this.setStyleProperty("transition", "none", el);
      return elInfo;
    });
  },
  disableZoom() {
    inZoom = false;
    doc.setAttribute("style", docStyle);
    zoomLevel = 0;
    if (storage.useScreenshot) return;
    doc.removeAttribute("in-zoom");
    fixedElsMapped.forEach(({ el, style }) => el.setAttribute("style", style));
  },
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
  getStrength(percentage: number) {
    if (percentage < 0.5) return 0.25 + 1.5 * percentage;
    return 1 + 6 * (percentage - 0.5);
  },
  setTargetEl(el: HTMLElement) {
    targetEl = el;
    this.setStyleProperty("position", "fixed");
    this.setStyleProperty("top", "0");
    this.setStyleProperty("left", "0");
    this.setStyleProperty("width", "100vw");
    this.setStyleProperty("height", "100vh");
    this.setStyleProperty("outline", "3px solid red");
    this.setStyleProperty("box-shadow", "0 0 15px 3px red");
    this.setStyleProperty("z-index", "9999999999999999999");
    this.setStyleProperty("background", "black"); // For fullscreen elements
  },
  setStyleProperty(key: string, value: string, el?: HTMLElement) {
    (el || targetEl).style.setProperty(key, value, "important");
  },
  updateStorage<Key extends keyof ChromeStorage>(
    key: Key,
    value: ChromeStorage[Key]
  ) {
    storage[key] = value;
  },
};
const utils = {
  getChildIndex(node: Node) {
    return Array.prototype.indexOf.call(node.parentElement!.childNodes, node);
  },
  insertChild(parent: HTMLElement, child: HTMLElement, idx: number) {
    parent.insertBefore(child, parent.childNodes[idx]);
  },
  sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },
  isVisible(el: HTMLElement) {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  },
  getFixedElements() {
    let q = "[style*='position:fixed'],[style*='position: fixed']";
    for (const { cssRules, disabled } of document.styleSheets) {
      if (disabled) continue;
      for (const rule of cssRules) {
        if (!(rule instanceof CSSStyleRule)) continue;
        if (rule.style.position == "fixed") q += "," + rule.selectorText;
      }
    }
    console.log(q);

    return [...doc.querySelectorAll(q)].filter(
      (el) => getComputedStyle(el).position == "fixed"
    ) as HTMLElement[];
  },
};
chrome.storage.sync.get(null, (response) => {
  storage = { ...storage, ...(response as ChromeStorage) };
  document.addEventListener("wheel", listeners.onWheel, { passive: false });
  document.addEventListener("mousemove", listeners.onMousemove);
  document.addEventListener("mousedown", listeners.onMousedown);
  document.addEventListener("mouseup", listeners.onMouseup);
  document.addEventListener("contextmenu", listeners.onContextmenu);
  document.addEventListener("keyup", listeners.onKeyup);
});
chrome.storage.onChanged.addListener((changes) => {
  for (const key of Object.keys(changes))
    helpers.updateStorage(key as keyof ChromeStorage, changes[key].newValue);
});
