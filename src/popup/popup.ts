(() => {
  let storage: ChromeStorage = {
    activationKey: "rightClick",
    websiteInteractivity: true,
    holdToZoom: true,
    useScreenshot: false,
    strength: 1,
    transition: 200,
  };

  const interactivityLabel = document.querySelector(
    "input[key='websiteInteractivity']"
  )!.parentElement!;
  const strengthValueEl = document.querySelector("#strength-value")!;
  const transitionValueEl = document.querySelector("#transition-value")!;
  const reviewEl = document.querySelector("#review") as HTMLAnchorElement;
  reviewEl.href = `https://chrome.google.com/webstore/detail/${chrome.runtime.id}/reviews`;

  chrome.storage.sync.get(null, (response) => {
    storage = { ...storage, ...(response as ChromeStorage) };

    for (const input of document.querySelectorAll("input")) {
      const key = input.getAttribute("key")!;
      const { activationKey, strength, transition, useScreenshot } = storage;

      if (
        (key as ActivationKey) == activationKey ||
        storage[key as keyof ChromeStorage] === true
      ) {
        input.checked = true;
      } else if (key == "strength") {
        input.value = strength.toFixed(2);
        strengthValueEl.textContent = getStrength(strength).toFixed(2);
      } else if (key == "transition") {
        input.value = transition.toString();
        transitionValueEl.textContent = transition + "ms";
      }
      if (useScreenshot) interactivityLabel.className = "disabled";

      input.addEventListener("click", inputClicked);
    }
  });

  function inputClicked(this: HTMLInputElement) {
    const key = this.getAttribute("key")!;
    if (this.type == "radio") {
      chrome.storage.sync.set({ activationKey: key });
    } else if (key == "strength") {
      const strength = parseFloat(this.value);
      chrome.storage.sync.set({ strength });
      strengthValueEl.textContent = getStrength(strength).toFixed(2);
    } else if (key == "transition") {
      const transition = Math.round(parseFloat(this.value));
      chrome.storage.sync.set({ transition });
      transitionValueEl.textContent = transition + "ms";
    } else {
      chrome.storage.sync.set({ [key]: this.checked });
      if (key == "useScreenshot")
        interactivityLabel.className = this.checked ? "disabled" : "";
    }
  }

  /* Shared function */
  function getStrength(percentage: number) {
    if (percentage < 0.5) return 0.25 + 1.5 * percentage;
    return 1 + 6 * (percentage - 0.5);
  }
})();
