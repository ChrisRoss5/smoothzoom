"use strict";
const isPresentation = !chrome.storage;
const extensionID = isPresentation
    ? "nlloamlgdioincflcopfgkbikjgaiihg"
    : chrome.runtime.id;
const webstoreURL = "https://chrome.google.com/webstore/detail/" + extensionID;
// For presentation at zoom.k1k1.dev
if (isPresentation) {
    document.querySelector("#available").style.display = "block";
    chrome.storage = {
        sync: {
            get: (keys, callback) => callback({}),
            set: (pair) => {
                for (const listener of chrome.storage.onChanged.listeners)
                    listener({
                        [Object.keys(pair)[0]]: { newValue: Object.values(pair)[0] },
                    });
            },
        },
        onChanged: {
            listeners: [],
            addListener(callback) {
                this.listeners.push(callback);
            },
        },
    };
}
(() => {
    if (window.matchMedia("(any-hover: none)").matches) {
        document.body.textContent =
            "The extension requires a mouse (pointing device).";
        document.body.style.textAlign = "center";
        return;
    }
    const titleEl = document.querySelector("#title");
    const reviewEl = document.querySelector("#review");
    const strengthValueEl = document.querySelector("#strength-value");
    const transitionValueEl = document.querySelector("#transition-value");
    titleEl.onclick = () => isPresentation
        ? location.assign(webstoreURL)
        : chrome.tabs.create({ url: "../index.html" });
    reviewEl.href = webstoreURL + "/reviews";
    for (const inputEl of document.querySelectorAll("input"))
        inputEl.addEventListener("click", inputClicked);
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
            if (key == "useScreenshot" && isPresentation) {
                this.checked = false;
                return alert("Install the extension to use this feature.");
            }
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
        /* "optional_permissions": [ "contentSettings" ], */
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
