"use strict";
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    /* https://developer.chrome.com/docs/extensions/reference/tabs/#method-captureVisibleTab */
    if (request == "TAKE_SCREENSHOT")
        chrome.tabs.captureVisibleTab(-2, { quality: 100 }, sendResponse);
    return true;
});
