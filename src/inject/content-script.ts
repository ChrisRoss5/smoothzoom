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
  let zoomLevel = 0;
  let lastZoomOrigin = { x: 0, y: 0 };
  let isDoubleClick = false;
  /*
  -- Iframes problem --
  */
  const sharedState = {
    inZoom: false,
    isPreparingZoom: false,
    isExitingZoom: false,
    isRightClickPressed: false,
  };
  const state = new Proxy(sharedState, {
    set: function (target, key, value) {
      target[key as keyof typeof target] = value;
      for (const frame of document.querySelectorAll("frame, iframe")) {
        const { contentWindow } = frame as HTMLIFrameElement;
        if (contentWindow) contentWindow.postMessage(target);
      }
      return true;
    },
  });
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
    async onWheel(e: WheelEvent) {
      if (!(helpers.isZoomReady(e) || state.inZoom)) return;
      listeners.stopEvent(e, true);
      if (state.isPreparingZoom || state.isExitingZoom) return;
      if (!state.inZoom) await control.prepareZoom();
      control.scale(e);
    },
    onMousemove(e: MouseEvent) {
      if (!state.inZoom || state.isExitingZoom || !storage.alwaysFollowCursor)
        return;
      control.transformOrigin(e, 0);
    },
    onMousedown(e: MouseEvent) {
      if (e.button == 2) state.isRightClickPressed = true;
    },
    onMouseup(e: MouseEvent) {
      if (!(state.isRightClickPressed && e.button == 2)) return;
      state.isRightClickPressed = false;
      if (storage.activationKey != "rightClick") return;
      // Using setTimeout to allow onContextmenu() before state.inZoom == false;
      if (state.inZoom) setTimeout(control.exitZoom);
      else if (state.isPreparingZoom) isDoubleClick = true;
    },
    onContextmenu(e: Event) {
      if (storage.activationKey == "rightClick") listeners.stopEvent(e);
    },
    async onKeyup(e: KeyboardEvent) {
      if (!helpers.isZoomOver(e)) return;
      listeners.stopEvent(e);
      if (state.inZoom) control.exitZoom();
      else if (state.isPreparingZoom) isDoubleClick = true;
    },
    onScroll() {
      if (!state.inZoom || storage.useScreenshot) return;
      helpers.setStyleProperty("--zoom-top", html.scrollTop + "px");
      helpers.setStyleProperty("--zoom-left", html.scrollLeft + "px");
    },
    onStopZoom() {
      isDoubleClick = true;
      control
        .exitZoom()
        .then(() => window.dispatchEvent(new Event("zoom-stopped")));
    },
    onMessage({ data: messageData }: { data: MessageData }) {
      if (!messageData.listener) return;
      /* Shared code begin */
      console.log(messageData.event.clientX, messageData.event.clientY);

      if (["onWheel", "onMousemove"].includes(messageData.listener))
        for (const frame of document.querySelectorAll("frame, iframe")) {
          {
            if (
              (frame as any).contentWindow.customFrameId == messageData.frameId
            ) {
              const { x, y } = frame.getBoundingClientRect();
              messageData.event.clientX += x;
              messageData.event.clientY += y;
              break;
            }
          }
        }
      /* Shared code end */
      listeners[messageData.listener](messageData.event);
    },
    stopEvent(e: Event, force?: boolean) {
      if ("isCustomEvent" in e) return;
      const { inZoom, isPreparingZoom, isExitingZoom } = state;
      if (inZoom || isPreparingZoom || isExitingZoom || force) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
  };
  const control = {
    async prepareZoom() {
      state.isPreparingZoom = true;
      if (storage.disableJavascript) await control.toggleJavascript(false);
      if (storage.useScreenshot) await control.createScreenshot();
      fullscreenEl = document.fullscreenElement as HTMLElement;
      if (fullscreenEl && fullscreenEl != html)
        await control.setFullscreenZoom();
      control.enableZoom();
      state.isPreparingZoom = false;
    },
    enableZoom() {
      state.inZoom = true;
      if (storage.disableInteractivity) html.setAttribute("no-events", "");
      if (storage.useScreenshot || inFullscreenZoom) return;
      docStyle = html.getAttribute("style") || "";
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
      state.inZoom = false;
      zoomLevel = 0;
      html.removeAttribute("no-events");
      if (storage.useScreenshot || inFullscreenZoom) return;
      html.setAttribute("style", docStyle);
      html.removeAttribute("in-zoom");
      helpers.resetElementsStyle(fixedElements);
    },
    scale(e: WheelEvent) {
      const started = !zoomLevel;
      const zoomType = -Math.sign(e.deltaY) as -1 | 1;
      const strength = zoomType * helpers.getStrength(storage.strength);
      const divisor = zoomLevel + strength < 0 ? 10 : 1;
      zoomLevel = Math.max(-0.9, zoomLevel + strength / divisor);
      this.transformOrigin(e, zoomType, started);
      helpers.setStyleProperty("transform", `scale(${1 + zoomLevel})`);
    },
    transformOrigin(e: MouseEvent, zoomType: -1 | 1 | 0, started?: boolean) {
      const useClient = storage.useScreenshot || inFullscreenZoom;
      const { scrollLeft, scrollTop, clientWidth, clientHeight } = targetEl;

      let x, y;
      if (useClient) {
        [x, y] = [e.clientX, e.clientY];
      } else if ("isCustomEvent" in e) {
        [x, y] = [e.clientX + scrollLeft, e.clientY + scrollTop];
      } else {
        [x, y] = [e.pageX, e.pageY];
      }

      let transition = `transform ${storage.transition}ms`;
      if (!storage.alwaysFollowCursor) {
        if (zoomLevel < 0) {
          x = scrollLeft + clientWidth / 2;
          y = scrollTop + clientHeight / 2;
        } else if (!started) {
          const [lastX, lastY] = [lastZoomOrigin.x, lastZoomOrigin.y];
          x = lastX - ((lastX - x) / (1 + zoomLevel ** 2)) * zoomType;
          y = lastY - ((lastY - y) / (1 + zoomLevel ** 2)) * zoomType;
          const right = scrollLeft + clientWidth;
          const bottom = scrollTop + clientHeight;
          x = Math.max(scrollLeft - 3, Math.min(x, right + 3));
          y = Math.max(scrollTop - 3, Math.min(y, bottom + 3));
          transition += `, transform-origin ${storage.transition}ms`;
        }
        lastZoomOrigin = { x, y };
      }
      helpers.setStyleProperty("transition", zoomType ? transition : "none");
      helpers.setStyleProperty("transform-origin", `${x}px ${y}px`);
    },
    async exitZoom() {
      if (!isDoubleClick && (!storage.holdToZoom || inFullscreenZoom)) {
        isDoubleClick = true;
        return;
      }
      isDoubleClick = false;
      state.isExitingZoom = true;
      const transition = `transform ${storage.transition}ms`;
      helpers.setStyleProperty("transition", transition);
      helpers.setStyleProperty("transform", "none");
      if (inFullscreenZoom) await control.removeFullscreenZoom();
      else await utils.sleep(storage.transition);
      if (storage.disableJavascript) await control.toggleJavascript(true);
      control.disableZoom();
      if (storage.useScreenshot) targetEl.remove();
      targetEl = html;
      state.isExitingZoom = false;
    },
    async setFullscreenZoom() {
      inFullscreenZoom = true;
      await utils.switchToFullscreenEl(html); // This "eats" the first event
      if (storage.useScreenshot) return;
      const ancestors = [fullscreenEl, ...utils.getAncestors(fullscreenEl)];
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
        const request = { message: "TAKE_SCREENSHOT" };
        chrome.runtime.sendMessage(request, (dataUrl: string) => {
          const img = document.createElement("img");
          helpers.setTargetEl(html.appendChild(img));
          img.onload = resolve;
          img.src = dataUrl;
        });
      });
    },
    toggleJavascript(enable: boolean) {
      return new Promise<void>((resolve) => {
        const request = {
          message: "TOGGLE_JAVASCRIPT",
          details: { enable, primaryPattern: location.origin + "/*" },
        };
        chrome.runtime.sendMessage(request, resolve);
      });
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
      /* https://stackoverflow.com/questions/71637367/requestfullscreen-not-working-with-modifier-keys-inside-keyup-event */
      try {
        await document.exitFullscreen();
      } catch {}
      try {
        el.requestFullscreen();
      } catch {}
    },
  };

  const options = { passive: false, capture: true };
  window.addEventListener("wheel", listeners.onWheel, options);
  window.addEventListener("mousemove", listeners.onMousemove);
  window.addEventListener("mousedown", listeners.onMousedown);
  window.addEventListener("mouseup", listeners.onMouseup);
  window.addEventListener("contextmenu", listeners.onContextmenu, true);
  window.addEventListener("keyup", listeners.onKeyup, true);
  window.addEventListener("scroll", listeners.onScroll);
  window.addEventListener("stop-zoom", listeners.onStopZoom);
  window.addEventListener("message", listeners.onMessage);
})();
