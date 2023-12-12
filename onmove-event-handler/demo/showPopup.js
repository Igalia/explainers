var windowProxy = null;

document.getElementById("showPopupButton").addEventListener("click", () => {
    showPopup();
});

document.getElementById("hidePopupButon").addEventListener("click", () => {
    hidePopup();
});

function showPopup() {
    const { left, top } = computePopupTopLeft();
    const opts = `popup,left=${left},top=${top},width=100,height=100`;
    windowProxy = open("popup.html", "popupDemo", opts);
  if (!windowProxy) {
    console.log("!windowProxy");
    return;
  }

    windowProxy.window.postMessage({ left, top });
}

function hidePopup() {
  if (!windowProxy) {
    console.log("!windowProxy");
    return;
  }

    windowProxy.window.postMessage({ "close": true });
}

window.addEventListener("move", (e) => {
  console.log("window moved");
  if (!windowProxy) {
    console.log("!windowProxy");
    return;
  }

    windowProxy.window.postMessage(computePopupTopLeft());
});

window.addEventListener("beforeunload", () => {
    hidePopup();
});

function computePopupTopLeft() {
    const buttonRect = showPopupButton.getBoundingClientRect();
    const buttonLeftAbs = screenX + buttonRect.left;

    const topMenuOffset = screen.availTop * window.devicePixelRatio;
    let buttonBottomAbs = screenY + buttonRect.bottom;
    if (topMenuOffset >= 0)
        buttonBottomAbs += topMenuOffset;

    const left = buttonLeftAbs - 100;
    const top = buttonBottomAbs;
    return { left, top };
}

if ("onmove" in window) {
    document.getElementById("featureStatus").innerText = "Implemented";
} else {
    console.log("Emulating the 'onmove' event ");
    document.getElementById("featureStatus").innerText = "Polifyll";
    var lastScreenX = screenX;
    var lastScreenY = screenY;
    var lastOuterWidth = outerWidth;
    var lastOuterHeight = outerHeight;
    
    function checkWindowRect() {
        console.log("Emitting the 'windowrectchanged' event ");
        if (screenX != lastScreenX || screenY != lastScreenY ||
            outerWidth != lastOuterWidth || outerHeight != lastOuterHeight) {
            lastScreenX = screenX;
            lastScreenY = screenY;
            lastOuterWidth = outerWidth;
            lastOuterHeight = outerHeight;

            let e = new Event("move", { bubbles: false });
            window.dispatchEvent(e);
        }
        requestAnimationFrame(checkWindowRect);
    }

    checkWindowRect()
}
