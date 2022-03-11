chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  /* https://developer.chrome.com/docs/extensions/reference/scripting */
  if (request == "useCanvas") {
    chrome.scripting.executeScript(
      {
        target: { tabId: sender.tab!.id!, allFrames: true },
        files: ["html2canvas.min.js"],
      },
      sendResponse
    );
  }

  return true;
});
