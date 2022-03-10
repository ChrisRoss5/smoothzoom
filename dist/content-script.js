"use strict";
const doc = document.documentElement;
doc.classList.add("smooth-zoom");
let zooming = false;
let zoomLevel = 0;
let scale = 1;
let x = 0;
let y = 0;
let activationKey;
let rightClickPressed = false;
chrome.storage.local.get(null, (storage) => {
    activationKey = storage.activationKey || "rightClick";
    document.addEventListener("wheel", onWheel, { passive: false });
    document.addEventListener("mousemove", onMousemove);
    document.addEventListener("mousedown", onMousedown);
    document.addEventListener("mouseup", onMouseup);
    document.addEventListener("contextmenu", onContextmenu);
});
function onWheel(e) {
    if (activationKey == "rightClick" && rightClickPressed) {
        zooming = true;
        transform(e);
    }
    //(e.altKey, e.ctrlKey, e.shiftKey);
    if (zooming)
        e.preventDefault();
}
function onMousemove(e) {
    if (!zooming || 1)
        return;
    doc.style.transition = "none";
    const percFromClientLeft = (e.clientX / doc.clientWidth) * 100;
    const percFromTop = (e.clientY / doc.clientHeight) * 100;
    const widthMultiplier = doc.clientWidth / doc.offsetWidth;
    const heightMultiplier = doc.clientHeight / doc.offsetHeight;
    const zoomDistance = getZoom(zoomLevel) - getZoom(zoomLevel - 1);
    const mouse_x = zoomDistance * (50 - percFromClientLeft) * widthMultiplier;
    const mouse_y = zoomDistance * (50 - percFromTop) * heightMultiplier;
    const new_x = x + mouse_x;
    const new_y = y + mouse_y;
    console.log(x, y);
    doc.style.transform = `scale(${scale}) translate(${new_x}%, ${new_y}%)`;
}
function onMousedown(e) {
    if (e.button == 2)
        rightClickPressed = true;
}
function onMouseup(e) {
    if (rightClickPressed && e.button == 2) {
        rightClickPressed = false;
        if (zooming && activationKey == "rightClick")
            setTimeout(removeZoom);
    }
}
function onContextmenu(e) {
    if (zooming)
        e.preventDefault();
}
function removeZoom() {
    zooming = false;
    zoomLevel = 0;
    x = 0;
    y = 0;
    doc.style.transition = "transform 100ms";
    doc.style.transform = "none";
}
function transform(e) {
    zoomLevel -= Math.sign(e.deltaY);
    doc.style.transition = "transform 100ms";
    const zoom = getZoom(zoomLevel);
    console.log("Zoom: " + zoom);
    scale = 1 + zoom;
    const percFromClientLeft = 0.5 - e.clientX / doc.clientWidth; // 50%
    const percFromTop = 0.5 - e.clientY / doc.clientHeight; // 100%
    const clientWidthPerc = doc.clientWidth / (doc.offsetWidth * (1 + getZoom(zoomLevel - 1))); // 100%
    const clientHeightPerc = doc.clientHeight / (doc.offsetHeight * (1 + getZoom(zoomLevel - 1))); // 50%
    const zoomDistancePerc = getZoom(zoomLevel) - getZoom(zoomLevel - 1); // 50%
    //console.log("percFromClientLeft: " + percFromClientLeft);
    console.log("percFromTop: " + percFromTop);
    //console.log("clientWidthPerc: " + clientWidthPerc);
    console.log("clientHeightPerc: " + clientHeightPerc);
    console.log("zoomDistancePerc: " + zoomDistancePerc);
    x += percFromClientLeft * clientWidthPerc * 100;
    y += ((percFromTop * clientHeightPerc) - (clientHeightPerc * zoomDistancePerc) / 2) * 100;
    console.log("y: " + y);
    doc.style.transform = `scale(${scale}) translate(${x}%, ${y}%)`;
}
function getZoom(level) {
    if (!level)
        return 0;
    return Math.max(0.5, /* Math.sqrt(level * 10) / 5 */ level / 2);
}
