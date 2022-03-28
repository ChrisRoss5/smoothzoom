/* Created with Typescript & SCSS by Kristijan Rosandić */
/* For testing: http://motherfuckingwebsite.com/ */

interface ElementAndStyle {
  el: HTMLElement;
  style: string;
}

(() => {
  const html = document.documentElement;
  let docStyle: string;
  let targetEl = html;
  let storage = {
    activationKey: "rightClick",
    websiteInteractivity:
      true /* https://stackoverflow.com/questions/32467151/how-to-disable-javascript-in-chrome-developer-tools-programmatically */,
    holdToZoom: true,
    useScreenshot: false,
    strength: 0.5,
    transition: 200,
  } as DefaultStorage as ChromeStorage;
  let zoomLevel = 0;
  let inZoom = false;
  let isPreparingZoom = false;
  let isExitingZoom = false;
  let isRightClickPressed = false;
  let isDoubleClick = false;
  /*
   * -- Fullscreen problem --
   * Current solution: Instead of changing fullscreenEl position in DOM, all
   * its ancestors need to have the highest specificity style which defines values:
   * filter, transform, backdrop-filter, perspective, contain,
   * transform-style, content-visibility, and will-change as none.
   */
  let inFullscreenZoom = false;
  let fullscreenEl: HTMLElement;
  let fullscreenElAncestors: ElementAndStyle[] = [];
  /*
   * -- Elements with position "fixed" problem --
   * Previous solution (100% working but slow):
   * [...doc.getElementsByTagName("*")].filter((el) => getComputedStyle(el).position == "fixed");
   * Current solution:
   * Reading CSS stylesheets, but due to CORS some might fail.
   * Possible solution (CHROME DEBUGGER):
   * https://stackoverflow.com/questions/63790794/get-css-rules-chrome-extension
   */
  let fixedElements: ElementAndStyle[] = [];
  /* --- Functions ---  */
  const listeners = {
    async onWheel(e: WheelEvent) {
      if (!(helpers.isZoomReady(e) || inZoom)) return;
      listeners.stop(e, true);
      if (isPreparingZoom || isExitingZoom) return;
      if (!inZoom) await control.prepareZoom();
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
      if (!(isRightClickPressed && e.button == 2)) return;
      isRightClickPressed = false;
      if (storage.activationKey != "rightClick") return;
      // Using setTimeout to allow onContextmenu() before inZoom == false;
      if (inZoom) setTimeout(control.exitZoom);
      else if (isPreparingZoom) isDoubleClick = true;
    },
    onContextmenu(e: Event) {
      listeners.stop(e);
    },
    async onKeyup(e: KeyboardEvent) {
      if (!helpers.isZoomOver(e)) return;
      listeners.stop(e);
      if (inZoom) control.exitZoom();
      else if (isPreparingZoom) isDoubleClick = true;
    },
    onScroll() {
      if (!inZoom || storage.useScreenshot) return;
      helpers.setStyleProperty("--zoom-top", html.scrollTop + "px");
      helpers.setStyleProperty("--zoom-left", html.scrollLeft + "px");
    },
    stop(e: Event, force?: boolean) {
      if (inZoom || isPreparingZoom || isExitingZoom || force) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
  };
  const control = {
    async prepareZoom() {
      isPreparingZoom = true;
      if (storage.useScreenshot) await control.createScreenshot();
      fullscreenEl = document.fullscreenElement as HTMLElement;
      if (fullscreenEl && fullscreenEl != html)
        await control.setFullscreenZoom();
      control.enableZoom();
      isPreparingZoom = false;
    },
    enableZoom() {
      inZoom = true;
      if (storage.useScreenshot) return;
      docStyle = html.getAttribute("style") || "";
      if (!storage.websiteInteractivity)
        helpers.setStyleProperty("pointer-events", "none");
      if (inFullscreenZoom) return;
      const { x, y } = utils.getHTMLScrollbarsWidth();
      helpers.setStyleProperty("width", "calc(100vw - " + x + "px)");
      helpers.setStyleProperty("height", "calc(100vh - " + y + "px)");
      html.setAttribute("in-zoom", "");
      helpers.setStyleProperty("--zoom-top", html.scrollTop + "px");
      helpers.setStyleProperty("--zoom-left", html.scrollLeft + "px");
      fixedElements = utils.getFixedElements().map((el) => {
        const elInfo = { el, style: el.getAttribute("style") || "" };
        const rect = el.getBoundingClientRect();
        const newTop = rect.top + html.scrollTop + "px";
        const newLeft = rect.left + html.scrollLeft + "px";
        helpers.setStyleProperty("top", newTop, el);
        helpers.setStyleProperty("left", newLeft, el);
        helpers.setStyleProperty("height", rect.height + "px", el);
        helpers.setStyleProperty("width", rect.width + "px", el);
        helpers.setStyleProperty("transition", "none", el);
        return elInfo;
      });
    },
    disableZoom() {
      inZoom = false;
      zoomLevel = 0;
      if (storage.useScreenshot || inFullscreenZoom) return;
      html.setAttribute("style", docStyle);
      html.removeAttribute("in-zoom");
      helpers.resetElementsStyle(fixedElements);
    },
    scale(e: WheelEvent) {
      const zoomType = -Math.sign(e.deltaY) as -1 | 1;
      const strength = zoomType * helpers.getStrength(storage.strength);
      const easeIn = (zoomType == -1 && !zoomLevel) || zoomLevel < 0;
      zoomLevel = Math.max(-0.9, zoomLevel + strength / (easeIn ? 4 : 1));
      const transition = `transform ${storage.transition}ms`;
      helpers.setStyleProperty("transition", transition);
      helpers.setStyleProperty("transform", `scale(${1 + zoomLevel})`);
      this.transformOrigin(e);
    },
    transformOrigin(e: MouseEvent) {
      const useClient = storage.useScreenshot || inFullscreenZoom;
      const [x, y] = useClient ? [e.clientX, e.clientY] : [e.pageX, e.pageY];
      helpers.setStyleProperty("transform-origin", `${x}px ${y}px`);
    },
    async exitZoom() {
      if (!isDoubleClick && (!storage.holdToZoom || inFullscreenZoom)) {
        isDoubleClick = true;
        return;
      }
      isDoubleClick = false;
      isExitingZoom = true;
      const transition = `transform ${storage.transition}ms`;
      helpers.setStyleProperty("transition", transition);
      helpers.setStyleProperty("transform", "none");
      if (inFullscreenZoom) await control.removeFullscreenZoom();
      else await utils.sleep(storage.transition);
      control.disableZoom();
      if (storage.useScreenshot) targetEl.remove();
      targetEl = html;
      isExitingZoom = false;
    },
    async setFullscreenZoom() {
      inFullscreenZoom = true;
      await utils.switchToFullscreenEl(html); // This "eats" the first event
      if (storage.useScreenshot) return;
      const ancestors = [fullscreenEl, ...utils.getAncestors(fullscreenEl)];
      console.log(ancestors.length);
      fullscreenElAncestors = ancestors.map((el) => {
        const temp = { el, style: el.getAttribute("style") || "" };
        if (el != fullscreenEl) helpers.disableContainingBlock(el);
        return temp;
      });
      helpers.setTargetEl(fullscreenEl);
    },
    async removeFullscreenZoom() {
      inFullscreenZoom = false;
      await utils.switchToFullscreenEl(fullscreenEl); // New event is required to allow this action
      if (storage.useScreenshot) return;
      helpers.resetElementsStyle(fullscreenElAncestors);
    },
    createScreenshot() {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage("TAKE_SCREENSHOT", (dataUrl: string) => {
          const img = document.createElement("img");
          helpers.setTargetEl(html.appendChild(img));
          img.onload = resolve;
          img.src = dataUrl;
        });
      });
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
      if (inFullscreenZoom) this.setStyleProperty("background", "black");
    },
    setStyleProperty(key: string, value: string, el?: HTMLElement) {
      (el || targetEl).style.setProperty(key, value, "important");
    },
    disableContainingBlock(el: HTMLElement) {
      this.setStyleProperty("filter", "none", el);
      this.setStyleProperty("transform", "none", el);
      this.setStyleProperty("backdrop-filter", "none", el);
      this.setStyleProperty("perspective", "none", el);
      this.setStyleProperty("contain", "none", el);
      this.setStyleProperty("transform-style", "initial", el);
      this.setStyleProperty("content-visibility", "initial", el);
      this.setStyleProperty("will-change", "initial", el);
    },
    resetElementsStyle(elements: ElementAndStyle[]) {
      elements.forEach(({ el, style }) => el.setAttribute("style", style));
    },
    updateStorage<Key extends keyof ChromeStorage>(
      key: Key,
      value: ChromeStorage[Key]
    ) {
      storage[key] = value;
    },
  };
  const utils = {
    sleep(ms: number) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },
    getAncestors: function* getAncestors(el: HTMLElement) {
      while ((el = el.parentElement!)) yield el;
    },
    getFixedElements() {
      let selectors = "[style*='position:fixed'],[style*='position: fixed']";
      for (const stylesheet of document.styleSheets) {
        if (stylesheet.disabled) continue;
        try {
          for (const rule of stylesheet.cssRules) {
            if (!(rule instanceof CSSStyleRule)) continue;
            if (rule.style.position == "fixed")
              selectors += "," + rule.selectorText;
          }
        } catch {} // CORS
      }
      return [...html.querySelectorAll(selectors)].filter(
        (el) => getComputedStyle(el).position == "fixed"
      ) as HTMLElement[];
    },
    getHTMLScrollbarsWidth() {
      const { clientWidth, clientHeight } = html;
      const { innerWidth, innerHeight } = window;
      return { x: innerWidth - clientWidth, y: innerHeight - clientHeight };
    },
    async switchToFullscreenEl(el: HTMLElement) {
      try {
        await document.exitFullscreen();
      } catch {}
      try {
        el.requestFullscreen();
      } catch {}
    },
  };

  chrome.storage.sync.get(null, (response) => {
    storage = { ...storage, ...(response as ChromeStorage) };
  });
  chrome.storage.onChanged.addListener((changes) => {
    for (const key of Object.keys(changes))
      helpers.updateStorage(key as keyof ChromeStorage, changes[key].newValue);
  });

  const options = { passive: false, capture: true };
  window.addEventListener("wheel", listeners.onWheel, options);
  window.addEventListener("mousemove", listeners.onMousemove);
  window.addEventListener("mousedown", listeners.onMousedown);
  window.addEventListener("mouseup", listeners.onMouseup);
  window.addEventListener("contextmenu", listeners.onContextmenu, true);
  window.addEventListener("keyup", listeners.onKeyup, true);
  window.addEventListener("scroll", listeners.onScroll);
})();
