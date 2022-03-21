/* For testing: http://motherfuckingwebsite.com/ */
(() => {
  const html = document.documentElement;
  let docStyle: string;
  let targetEl = html;
  let storage = {
    activationKey: "rightClick",
    websiteInteractivity: true,
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
   * Fullscreen problem
   * Possible solution #2: Instead of changing fullscreenEl position in DOM, all
   * its ancestors need to have the highest specificity style which defines values:
   * filter, transform, backdrop-filter, perspective, contain,
   * transform-style, content-visibility, and will-change as none.
   */
  let inFullscreenZoom = false;
  let fullscreenEl: HTMLElement;
  let fullscreenElParent: HTMLElement;
  let fullscreenElIdx: number;
  let fullscreenElStyle: string;
  /*
   * Elements with position "fixed" problem
   * Previous solution (100% working but slow):
   * [...doc.getElementsByTagName("*")].filter((el) =>
   * getComputedStyle(el).position == "fixed");
   */
  let fixedElements: { el: HTMLElement; style: string }[] = [];

  const listeners = {
    async onWheel(e: WheelEvent) {
      if (!(helpers.isZoomReady(e) || inZoom)) return;
      e.preventDefault();
      if (isPreparingZoom || isExitingZoom) return;
      if (!inZoom) {
        isPreparingZoom = true;
        if (storage.useScreenshot) await control.createScreenshot();
        fullscreenEl = document.fullscreenElement as HTMLElement;
        if (fullscreenEl && fullscreenEl != html)
          await control.setFullscreenZoom();
        control.enableZoom();
        isPreparingZoom = false;
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
        // Using setTimeout to allow onContextmenu() before inZoom == false;
        if (storage.activationKey != "rightClick") return;
        if (inZoom) setTimeout(control.exitZoom);
        else if (isPreparingZoom) isDoubleClick = true;
      }
    },
    onContextmenu(e: Event) {
      if (inZoom || isPreparingZoom || isExitingZoom) e.preventDefault();
    },
    onKeyup(e: KeyboardEvent) {
      if (!helpers.isZoomOver(e)) return;
      if (inZoom) control.exitZoom();
      else if (isPreparingZoom) isDoubleClick = true;
    },
    onScroll() {
      if (!inZoom || storage.useScreenshot) return;
      helpers.setStyleProperty("--zoom-top", html.scrollTop + "px");
      helpers.setStyleProperty("--zoom-left", html.scrollLeft + "px");
    },
  };
  const control = {
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
      helpers.setStyleProperty("overflow", "hidden");
      html.setAttribute("in-zoom", "");
      helpers.setStyleProperty("--zoom-top", html.scrollTop + "px");
      helpers.setStyleProperty("--zoom-left", html.scrollLeft + "px");
      fixedElements = utils.getFixedElements().map((el) => {
        const elInfo = { el, style: el.getAttribute("style") || "" };
        const rect = el.getBoundingClientRect();
        helpers.setStyleProperty("top", rect.top + html.scrollTop + "px", el);
        helpers.setStyleProperty(
          "left",
          rect.left + html.scrollLeft + "px",
          el
        );
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
      fixedElements.forEach(({ el, style }) => el.setAttribute("style", style));
    },
    scale(e: WheelEvent) {
      const zoomType = -Math.sign(e.deltaY) as -1 | 1;
      const strength = zoomType * helpers.getStrength(storage.strength);
      const easeIn = (zoomType == -1 && !zoomLevel) || zoomLevel < 0;
      zoomLevel = Math.max(-0.9, zoomLevel + strength / (easeIn ? 4 : 1));
      helpers.setStyleProperty(
        "transition",
        `transform ${storage.transition}ms`
      );
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
      helpers.setStyleProperty(
        "transition",
        `transform ${storage.transition}ms`
      );
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
      await document.exitFullscreen();
      html.requestFullscreen(); // This "eats" the first event
      if (storage.useScreenshot) return;
      fullscreenElStyle = fullscreenEl.getAttribute("style") || "";
      fullscreenElParent = fullscreenEl.parentElement!;
      fullscreenElIdx = utils.getChildIndex(fullscreenEl);
      helpers.setTargetEl(html.appendChild(fullscreenEl));
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
  };
  chrome.storage.sync.get(null, (response) => {
    storage = { ...storage, ...(response as ChromeStorage) };
    document.addEventListener("wheel", listeners.onWheel, { passive: false });
    document.addEventListener("mousemove", listeners.onMousemove);
    document.addEventListener("mousedown", listeners.onMousedown);
    document.addEventListener("mouseup", listeners.onMouseup);
    document.addEventListener("contextmenu", listeners.onContextmenu);
    document.addEventListener("keyup", listeners.onKeyup);
    document.addEventListener("scroll", listeners.onScroll);
  });
  chrome.storage.onChanged.addListener((changes) => {
    for (const key of Object.keys(changes))
      helpers.updateStorage(key as keyof ChromeStorage, changes[key].newValue);
  });
})();
