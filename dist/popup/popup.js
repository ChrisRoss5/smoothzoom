"use strict";
let _storage = {
    activationKey: "rightClick",
    usePointerEvents: true,
    useDoubleClick: false,
    useCanvas: false,
    strength: 1,
};
chrome.storage.local.get(null, (response) => {
    _storage = Object.assign(Object.assign({}, _storage), response);
    const strengthValueEl = document.querySelector("#strength-value");
    for (const input of document.querySelectorAll("input")) {
        const key = input.getAttribute("key");
        if (key == _storage.activationKey ||
            _storage[key] === true) {
            input.checked = true;
        }
        else if (key == "strength") {
            input.value = strengthValueEl.textContent = _storage.strength
                .toFixed(2)
                .toString();
        }
        input.onclick = (e) => {
            if (e.type == "radio") {
                chrome.storage.local.set({ activationKey: key });
            }
            else if (key == "strength") {
                const strength = parseFloat(input.value).toFixed(2);
                chrome.storage.local.set({ strength });
                strengthValueEl.textContent = strength;
            }
            else {
                chrome.storage.local.set({ [key]: input.checked });
            }
        };
    }
});
