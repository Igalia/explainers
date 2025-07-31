# Explainer: The 'sticky' feature of window.open

- Contents:
  - [Authors](#Authors)
  - [Introduction](#Introduction)
  - [Context](#Context)
  - [Motivation](#Motivation)
  - [Proposal](#Proposal)
  - [Testing](#Testing)
  - [Risks](#Risks)
  - [Security and Privacy Considerations](#Security-and-Privacy-Considerations)

## Authors

* Cathie Chen \<cathiechen@igalia.com>


This proposal is developed from the [onmove event proposal](https://github.com/Igalia/explainers/blob/main/onmove-event-handler/README.md), which we are no longer pursuing. It is an attempt to solve similar problems with a declarative approach, as per [CSS WG discussion](https://github.com/w3c/csswg-drafts/issues/7693).

## Introduction

This feature's main goal is to provide web authors with a way to make the child window created by `window.open` follow the movement of the current window.

* This document status: Active
* Expected venue:
  - [HTML Living Standard](https://html.spec.whatwg.org/)
  - [CSSOM View Module](https://drafts.csswg.org/cssom-view/)

## Context

In some scenarios, web authors would like the window created by `window.open` to follow the movement of the current window. The [Window object](https://drafts.csswg.org/cssom-view/#extensions-to-the-window-interface) exposes some attributes to describe its position in the screen. There are `moveTo` and `moveBy` functions, which could change the screen position. These make it possible to do it through JS: in the current window we could check the screen position of itself in every `requestAnimationFrame`. If the position has changed, move the child window by `moveTo` or `moveBy`. The drawback is that by doing it this way, we have to check the screen position in every `requestAnimationFrame`, which is not good for performance. If the current window navigates to another URL, it is impossible to keep the connection, for the new page would have lost the reference to the sub windows.

Furthermore, some engines are looking into hiding screen position information due to privacy concerns, so the approach described above might become impossible to implement.

## Motivation

The main use case for a feature like this would be to allow a popup window opened by a window to follow the movement of its parent. There is a demo on this repo to show this use case, using a polyfill of the feature.

polyfil.html
```html
<!doctype html>
<script>
let lastX;
let lastY;
let subWindow;

function createSubWindow() {
    lastX = window.screenX;
    lastY = window.screenY;
    subWindow = window.open("./sub-001.html", "_blank", "width=200,height=200");
    checkWindowPosition();
}

function checkWindowPosition() {
    if (window.screenX !== lastX || window.screenY !== lastY) {
        onWindowMove(window.screenX - lastX, window.screenY - lastY);
        lastX = window.screenX;
        lastY = window.screenY;        
    }
    requestAnimationFrame(checkWindowPosition);
}

function onWindowMove(movedX, movedY) {
    subWindow.moveBy(movedX, movedY);
}
</script>

<body>
    Created the first window. Click to create a new one. The new window will be sticky.
    <br>
    <input type="button" value="new window" onclick="createSubWindow()">
</body>
```

sub-001.html
```html
<!doctype html>
<title>sub-001</title>

<body>
    This is the sub window, following the movement of the opener.
</body>
```

## Proposal

We propose adding a feature "sticky" to `window.open`. The newly created window would follow the movement of the current window. We can call the newly-created window a _sticky window_.

To implement, the current window's frame could keep a weak reference to the sticky window's frame (let's call it a _sticky frame_).
When the screen rect of the current window changes, it checks any associated sticky frames and uses `moveBy` to move the sticky windows. The distance the sticky window moves should match the change in the origin of the current window’s outer position — that is, `window.left` and `window.top`. For example, if the current window moves from (x, y) to (x1, y1), the sticky window should be moved by `moveBy(x1 - x, y1 - y)`.

The "sticky" feature will only be effective for windows that have the same origin, and the connection remains as long as windows navigate inside the same origin.

With "sticky" supported, the code becomes much shorter.

Sticky.html
```html
<!doctype html>
<script>
function createSubWindow() {
    subWindow = window.open("./sub-001.html", "_blank", "width=200,height=200,sticky");
}
</script>

<body>
    Created the first window. Click to create a new one. The new window will be sticky.
    <br>
    <input type="button" value="new window" onclick="createSubWindow()">
</body>
```

We also propose adding functions to manage the connection between the parent and child windows and without revealing sensitive information:

- For the current window, add a function: `removeAllStickyWindows()` to remove all the sticky windows.
- For the created windows, add functions:
   1. `addStickyFeature()`, to make a window a sticky window to its opener if they are inside same origin. If the window does not meet the required constraints, an error will be thrown: "Failed to add sticky feature".
   2. `removeStickyFeature()`, to remove a window from its opener's sticky windows.

## Testing

The `window.moveTo` and `window.moveBy` methods require that the target is an auxiliary browser context. Thus, we could try to use `window.open` to create windowA, then windowA could create its sticky windows, change windowA's position by `moveBy` or `moveTo`, and eventually check the screen position of sticky windows.

Another other approach would be to use the [Set Window Rect](https://www.w3.org/TR/webdriver2/#set-window-rect) and [Get Window Rect](https://www.w3.org/TR/webdriver2/#get-window-rect) WebDriver commands, and defining tests likes this:

```js
promise_test(async t => {
    let subWindow = window.open("./sub-001.html", "_blank", "width=200,height=200,sticky");
    let currentX = window.screenX;
    let currentY = window.screenY;
    let currentSubX = subWindow.screenX;
    let currentSubY = subWindow.screenY;
    var expectedRect = {'x': currentX + 100, 'y': currentY + 200};
    await test_driver.set_window_rect(expectedRect);
    assert_equals(subWindow.screenX - currentSubX, 100, "The sub window screenX is correct.")
    assert_equals(subWindow.screenY - currentSubY, 200, "The sub window screenY is correct.")
}, "Window.open sticky feature");
```

## Risks

### The overlapping problem
Sometimes windows overlap. We use the function `moveBy` to move the sticky windows, and this function cannot move windows off-screen. Thus, if our current window is touching the screen edge, the sticky window would overlap, and it follows the movement, so it could be completely covered sometimes. To fix this, we propose to stop the sticky window following the movement whenever they overlap. We use the outer window’s coordinate rectangle — defined by (left, top) and (outerWidth, outerHeight) — to check for overlap.

### The multiple display problem
This scenario is common, and the sticky feature is quite useful. However, the `moveBy` function cannot move windows across display boundaries. To address this, we need a way to move the sticky window across displays. In our prototype, the renderer side does not clip the sticky window’s destination when calling `moveBy`. On the browser side, it identifies the opener’s `display_id` and checks whether the sticky window’s outer coordinate rectangle intersects with the opener's display. If it does, the sticky window is moved to that display. Otherwise, it remains on the current display, and the destination rectangle is clipped to fit within the current display.

### The virtual display problem
This problem is similar to the previous one. If the current window moves to another virtual display, ideally, the sticky windows should follow the movement.

### The cross-origin problem
The sticky feature is only effective if the windows are not cross-origin. The connection will remain if they navigate inside the same origin. For the current window, the connection remains even after it navigates, which might be confusing sometimes.

### Memory management
If the sticky frame is detached, as the current window's frame only keeps a weak reference, it won't block the release of the sticky frame. What we need to do additionally is to check if the sticky window is still attached when we try to `moveBy` it. So there is no problem.

## Security and Privacy Considerations
This feature does not reveal extra sensitive information, as it is only effective inside same same-origin windows, and there is no data kept across browsing sessions.


