"use strict";
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason == chrome.runtime.OnInstalledReason.INSTALL) {
        chrome.runtime.setUninstallURL("https://forms.gle/w4wf7qwWE3ZkavhD7");
        chrome.tabs.create({ url: "../welcome/welcome.html#installed" });
    }
});
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    /* https://developer.chrome.com/docs/extensions/reference/tabs/#method-captureVisibleTab */
    if (request == "TAKE_SCREENSHOT")
        chrome.tabs.captureVisibleTab(-2, { quality: 100 }, sendResponse);
    return true;
});
