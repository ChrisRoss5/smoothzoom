"use strict";
(() => {
    let storage = {
        activationKey: "rightClick",
        websiteInteractivity: true,
        holdToZoom: true,
        useScreenshot: false,
        strength: 1,
        transition: 200,
    };
    const strengthValueEl = document.querySelector("#strength-value");
    const transitionValueEl = document.querySelector("#transition-value");
    const reviewEl = document.querySelector("#review");
    reviewEl.href = `https://chrome.google.com/webstore/detail/${chrome.runtime.id}/reviews`;
    chrome.storage.sync.get(null, (response) => {
        storage = Object.assign(Object.assign({}, storage), response);
        for (const input of document.querySelectorAll("input")) {
            const key = input.getAttribute("key");
            const { activationKey, strength, transition } = storage;
            if (key == activationKey ||
                storage[key] === true) {
                input.checked = true;
            }
            else if (key == "strength") {
                input.value = strength.toFixed(2);
                strengthValueEl.textContent = getStrength(strength).toFixed(2);
            }
            else if (key == "transition") {
                input.value = transition.toString();
                transitionValueEl.textContent = transition + "ms";
            }
            input.onclick = () => {
                if (input.type == "radio") {
                    chrome.storage.sync.set({ activationKey: key });
                }
                else if (key == "strength") {
                    const strength = parseFloat(input.value);
                    chrome.storage.sync.set({ strength });
                    strengthValueEl.textContent = getStrength(strength).toFixed(2);
                }
                else if (key == "transition") {
                    const transition = Math.round(parseFloat(input.value));
                    chrome.storage.sync.set({ transition });
                    transitionValueEl.textContent = transition + "ms";
                }
                else {
                    chrome.storage.sync.set({ [key]: input.checked });
                }
            };
        }
    });
    /* Shared function */
    function getStrength(percentage) {
        if (percentage < 0.5)
            return 0.25 + 1.5 * percentage;
        return 1 + 6 * (percentage - 0.5);
    }
})();
