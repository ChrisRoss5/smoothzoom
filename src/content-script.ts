chrome.storage.local.get(null, (storage) => {
  // Triggering the observer
  if (/complete|interactive|loaded/.test(document.readyState)) startObserving();
  else document.addEventListener("DOMContentLoaded", startObserving, false);
});

function startObserving() {
  document.documentElement.onwheel = (e: WheelEvent) => {
    console.log(e);
  };
}
