"use strict";
(() => {
    const titleEl = document.querySelector("#title");
    const reviewEl = document.querySelector("#review");
    const strengthValueEl = document.querySelector("#strength-value");
    const transitionValueEl = document.querySelector("#transition-value");
    titleEl.onclick = () => chrome.tabs.create({ url: "../welcome/welcome.html" });
    reviewEl.href = `https://chrome.google.com/webstore/detail/${chrome.runtime.id}/reviews`;
    /* Storage */
    let storage = {
        activationKey: "rightClick",
        holdToZoom: true,
        alwaysFollowCursor: true,
        disableInteractivity: false,
        disableJavascript: false,
        useScreenshot: false,
        strength: 0.5,
        transition: 200,
    };
    chrome.storage.sync.get(null, (response) => {
        storage = Object.assign(Object.assign({}, storage), response);
        setInputValues();
    });
    chrome.storage.onChanged.addListener((changes) => {
        for (const key of Object.keys(changes))
            updateStorage(key, changes[key].newValue);
        setInputValues();
    });
    /* Functions */
    function setInputValues() {
        for (const inputEl of document.querySelectorAll("input")) {
            const key = inputEl.getAttribute("key");
            const { activationKey, strength, transition } = storage;
            const value = storage[key];
            if (key == activationKey) {
                inputEl.checked = true;
            }
            else if (typeof value == "boolean") {
                inputEl.checked = value;
            }
            else if (key == "strength") {
                inputEl.value = strength.toFixed(2);
                strengthValueEl.textContent = (1 + getStrength(strength)).toFixed(2);
            }
            else if (key == "transition") {
                inputEl.value = transition.toString();
                transitionValueEl.textContent = transition + "ms";
            }
            inputEl.addEventListener("click", inputClicked);
        }
    }
    function inputClicked() {
        const key = this.getAttribute("key");
        if (this.type == "radio") {
            chrome.storage.sync.set({ activationKey: key });
        }
        else if (key == "strength") {
            const strength = parseFloat(this.value);
            chrome.storage.sync.set({ strength });
            strengthValueEl.textContent = (1 + getStrength(strength)).toFixed(2);
        }
        else if (key == "transition") {
            const transition = Math.round(parseFloat(this.value));
            chrome.storage.sync.set({ transition });
            transitionValueEl.textContent = transition + "ms";
        }
        else {
            if (key == "disableJavascript")
                toggleJavascript(this);
            else
                chrome.storage.sync.set({ [key]: this.checked });
        }
    }
    function toggleJavascript(inputEl) {
        const disableJavascript = inputEl.checked;
        const permissions = ["contentSettings"];
        /* https://developer.chrome.com/docs/extensions/reference/permissions */
        chrome.permissions.contains({ permissions }, (contains) => {
            if (contains)
                chrome.storage.sync.set({ disableJavascript });
            else
                chrome.permissions.request({ permissions }, (granted) => {
                    if (granted)
                        chrome.storage.sync.set({ disableJavascript });
                    else
                        inputEl.checked = false;
                });
        });
    }
    /* Shared functions from content-script */
    function getStrength(percentage) {
        if (percentage < 0.5)
            return 0.25 + 1.5 * percentage;
        return 1 + 6 * (percentage - 0.5);
    }
    function updateStorage(key, value) {
        storage[key] = value;
    }
})();
