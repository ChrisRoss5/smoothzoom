(() => {
  const overlayEl = document.querySelector("#overlay") as HTMLElement;
  const secretEl = document.querySelector("#secret") as HTMLElement;
  const authorEl = secretEl.querySelector("#author") as HTMLElement;

  secretEl.onclick = async () => {
    showOverlay().then(() => {
      authorEl.style.opacity = "1";
      authorEl.style.transform = "none";
      buttonEl.onclick = () => overlayEl.remove();
    })
  };

  if (location.hash != "#installed") return;
  location.hash = "";

  const installedEl = overlayEl.firstElementChild as HTMLElement;
  const buttonEl = installedEl.querySelector("button") as HTMLElement;

  showOverlay().then(() => {
    installedEl.style.opacity = "1";
    installedEl.style.transform = "none";
    buttonEl.onclick = () => overlayEl.remove();
  })

  function showOverlay() {
    return new Promise(res => {
      overlayEl.style.display = "block";
      overlayEl.offsetWidth; // NOSONAR
      overlayEl.style.opacity = "1";
      setTimeout(() => res, 250);
    });
  }
})();
