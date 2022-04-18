interface Request {
  message: string;
  details?: { enable: boolean; primaryPattern: string };
}

const listeners = {
  onInstalled(details: chrome.runtime.InstalledDetails) {
    if (details.reason == chrome.runtime.OnInstalledReason.INSTALL) {
      chrome.runtime.setUninstallURL("https://forms.gle/w4wf7qwWE3ZkavhD7");
      chrome.tabs.create({ url: "../welcome/welcome.html#installed" });
    } else if (details.reason == chrome.runtime.OnInstalledReason.UPDATE) {
      const previousVersion = details.previousVersion || "";
      // const newVersion: string = chrome.runtime.getManifest().version;
      if (utils.cmpVersions(previousVersion, "1.1") < 0)
        chrome.tabs.create({ url: "../welcome/welcome.html#updated" });
    }
  },
  onMessage(
    request: Request,
    sender: chrome.runtime.MessageSender,
    _sendResponse: typeof sendResponse
  ) {
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
  getFixedElements(sender: chrome.runtime.MessageSender) {
    /* https://stackoverflow.com/a/63822633/10264782 */
    const debuggee: chrome.debugger.Debuggee = { tabId: sender.tab?.id };
    chrome.debugger.attach(debuggee, "1.3", async () => {
      const send = (method: string, params?: Object): any =>
        new Promise((resolve) =>
          chrome.debugger.sendCommand(debuggee, method, params, resolve)
        );
      await send("Page.enable");
      const { frameTree } = await send("Page.getResourceTree");
      const { resources, frame: { id: frameId } } = frameTree; // prettier-ignore
      const selectors: string[] = [];
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
  toggleJavascript(request: Request) {
    if (request.details!.enable) {
      chrome.contentSettings.javascript.clear({}, sendResponse);
    } else {
      const setDetails = {
        primaryPattern: request.details!.primaryPattern,
        setting: "block",
      } as chrome.contentSettings.JavascriptSetDetails;
      chrome.contentSettings.javascript.set(setDetails, sendResponse);
    }
  },
};
const utils = {
  findSelectors(content: string) {
    return [...(content as any).matchAll(/position\s*:\s*fixed/g)].map(
      ({ index }) => {
        const openingBracketIdx = content.lastIndexOf("{", index);
        let startingIdx = openingBracketIdx;
        while (startingIdx) if (/[{}/;]/.test(content[--startingIdx])) break;
        startingIdx = startingIdx ? startingIdx + 1 : 0;
        return content.substring(startingIdx, openingBracketIdx).trim();
      }
    );
  },
  cmpVersions(a: string, b: string) {
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

let sendResponse: (response?: any) => void;
chrome.runtime.onInstalled.addListener(listeners.onInstalled);
chrome.runtime.onMessage.addListener(listeners.onMessage);
