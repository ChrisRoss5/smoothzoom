(() => {
  let storage: ChromeStorage = {
    activationKey: "rightClick",
    websiteInteractivity: true,
    holdToZoom: true,
    useCanvas: false,
    strength: 1,
  } as DefaultStorage;

  chrome.storage.sync.get(null, (response) => {
    storage = { ...storage, ...(response as ChromeStorage) };

    const strengthValueEl = document.querySelector("#strength-value")!;

    for (const input of document.querySelectorAll("input")) {
      const key = input.getAttribute("key")!;

      if (
        key == storage.activationKey ||
        storage[key as keyof ChromeStorage] === true
      ) {
        input.checked = true;
      } else if (key == "strength") {
        const strength = (storage.strength || 1);
        input.value = strength.toFixed(2);
        strengthValueEl.textContent = getStrength(strength).toFixed(2);
      }

      input.onclick = () => {
        if (input.type == "radio") {
          chrome.storage.sync.set({ activationKey: key });
        } else if (key == "strength") {
          const strength = parseFloat(input.value);
          chrome.storage.sync.set({ strength });
          strengthValueEl.textContent = getStrength(strength).toFixed(2);
        } else {
          chrome.storage.sync.set({ [key]: input.checked });
        }
      };
    }
  });

  function getStrength(percentage: number) {
    if (percentage < 0.5) return 0.25 + 1.5 * percentage;
    return 1 + 6 * (percentage - 0.5);
  }
})();
