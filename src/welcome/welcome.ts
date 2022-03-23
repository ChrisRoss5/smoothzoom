(() => {
  if (location.hash != "#installed") return;
  location.hash = "";

  const overlayEl = document.querySelector("#overlay") as HTMLElement;
  const installedEl = overlayEl.firstElementChild as HTMLElement;
  const buttonEl = installedEl.querySelector("button") as HTMLElement;

  overlayEl.style.display = "block";
  overlayEl.offsetWidth; // NOSONAR
  overlayEl.style.opacity = "1";
  setTimeout(() => {
      installedEl.style.opacity = "1";
      installedEl.style.transform = "none";
  }, 250);
  buttonEl.onclick = () => overlayEl.remove();
})();
