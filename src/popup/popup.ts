let _storage: ChromeStorage = {
  activationKey: "rightClick",
  usePointerEvents: true,
  useDoubleClick: false,
  useCanvas: false,
  strength: 1,
} as DefaultStorage;

chrome.storage.local.get(null, (response) => {
  _storage = { ..._storage, ...(response as ChromeStorage) };

  const strengthValueEl = document.querySelector("#strength-value")!;

  for (const input of document.querySelectorAll("input")) {
    const key = input.getAttribute("key")!;
    if (
      key == _storage.activationKey ||
      _storage[key as keyof ChromeStorage] === true
    ) {
      input.checked = true;
    } else if (key == "strength") {
      input.value = strengthValueEl.textContent = _storage.strength
        .toFixed(2)
        .toString();
    }

    input.onclick = (e) => {
      if (e.type == "radio") {
        chrome.storage.local.set({ activationKey: key });
      } else if (key == "strength") {
        const strength = parseFloat(input.value).toFixed(2);
        chrome.storage.local.set({ strength });
        strengthValueEl.textContent = strength;
      } else {
        chrome.storage.local.set({ [key]: input.checked });
      }
    };
  }
});
