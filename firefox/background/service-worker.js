"use strict";
const listeners = {
  onInstalled(details) {
    if (details.reason == chrome.runtime.OnInstalledReason.INSTALL) {
      chrome.runtime.setUninstallURL("https://forms.gle/w4wf7qwWE3ZkavhD7");
      chrome.tabs.create({ url: "../welcome.html#installed" });
    } else if (details.reason == chrome.runtime.OnInstalledReason.UPDATE) {
      const previousVersion = details.previousVersion || "";
      // const newVersion: string = chrome.runtime.getManifest().version;
      if (utils.cmpVersions(previousVersion, "1.1") < 0)
        chrome.tabs.create({ url: "../welcome.html#updated" });
    }
  },
  onMessage(request, sender, _sendResponse) {
    sendResponse = _sendResponse;
    if (request.message == "TAKE_SCREENSHOT")
      /* https://developer.chrome.com/docs/extensions/reference/tabs/#method-captureVisibleTab */
      chrome.tabs.captureVisibleTab(-2, { quality: 100 }, _sendResponse);
    else if (request.message == "TOGGLE_JAVASCRIPT")
      /* https://developer.chrome.com/docs/extensions/reference/contentSettings/#property-javascript */
      control.toggleJavascript(request);
    else if (request.message == "GET_FIXED_ELEMENT_SELECTORS")
      /* https://developer.chrome.com/docs/extensions/reference/debugger/ */
      control.getFixedElements(sender);
    return true;
  },
};
const control = {
  getFixedElements(sender) {
    var _a;
    /* https://stackoverflow.com/a/63822633/10264782 */
    const debuggee = {
      tabId: (_a = sender.tab) === null || _a === void 0 ? void 0 : _a.id,
    };
    chrome.debugger.attach(debuggee, "1.3", async () => {
      const send = (method, params) =>
        new Promise((resolve) =>
          chrome.debugger.sendCommand(debuggee, method, params, resolve)
        );
      await send("Page.enable");
      const { frameTree } = await send("Page.getResourceTree");
      const { resources, frame: { id: frameId } } = frameTree; // prettier-ignore
      const selectors = [];
      for (const { type, mimeType, url } of resources) {
        if (!(type == "Stylesheet" || mimeType == "text/css")) continue;
        const params = { frameId, url };
        const { content } = await send("Page.getResourceContent", params);
        if (!content) continue;
        selectors.push(...utils.findSelectors(content));
      }
      chrome.debugger.detach(debuggee);
      sendResponse(selectors);
    });
  },
  toggleJavascript(request) {
    if (request.details.enable) {
      chrome.contentSettings.javascript.clear({}, sendResponse);
    } else {
      const setDetails = {
        primaryPattern: request.details.primaryPattern,
        setting: "block",
      };
      chrome.contentSettings.javascript.set(setDetails, sendResponse);
    }
  },
};
const utils = {
  findSelectors(content) {
    return [...content.matchAll(/position\s*:\s*fixed/g)].map(({ index }) => {
      const openingBracketIdx = content.lastIndexOf("{", index);
      let startingIdx = openingBracketIdx;
      while (startingIdx) if (/[{}/;]/.test(content[--startingIdx])) break;
      startingIdx = startingIdx ? startingIdx + 1 : 0;
      return content.substring(startingIdx, openingBracketIdx).trim();
    });
  },
  cmpVersions(a, b) {
    /* Return values:
          - a number < 0 if a < b
          - a number > 0 if a > b
          - 0 if a = b */
    const segmentsA = a.replace(/(\.0+)+$/, "").split(".");
    const segmentsB = b.replace(/(\.0+)+$/, "").split(".");
    for (let i = 0; i < Math.min(segmentsA.length, segmentsB.length); i++) {
      const diff = parseInt(segmentsA[i], 10) - parseInt(segmentsB[i], 10);
      if (diff) return diff;
    }
    return segmentsA.length - segmentsB.length;
  },
};
/* Listeners Registration */
let sendResponse;
chrome.runtime.onInstalled.addListener(listeners.onInstalled);
chrome.runtime.onMessage.addListener(listeners.onMessage);
