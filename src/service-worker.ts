chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  /* https://developer.chrome.com/docs/extensions/reference/scripting */
  if (request == "useCanvas") {
    const target = { tabId: sender.tab!.id!, allFrames: true };
    const [canvasJS, canvasCSS] = ["html2canvas.min.js", "canvas.css"];
    chrome.scripting.executeScript({ target, files: [canvasJS] }, sendResponse);
    chrome.scripting.insertCSS({ target, files: [canvasCSS] });
  }

  return true;
});
