# Explainer: The 'onmove' Window Object event handler

- Contents:
  - [Authors](#authors)
  - [Introduction](#introduction)
  - [Motivation](#motivation)
  - [Risks](#risks)

## Authors

* Javier Fernandez \<jfernandez@igalia.com>

## Introduction

The main goal of this feature is to provide web authors a mechanism to track and control the position of the Window object.

We would need to add a new element in the [WindowEventHandler interface](https://html.spec.whatwg.org/#windoweventhandlers) and integrate it with the HTML [event loop](https://html.spec.whatwg.org/#event-loop), so that whenever a window changes its position an event ```move``` is fired.

* This document status: Active
* Expected venue:
  - [HTML Living Standard](https://html.spec.whatwg.org/)
  - [CSSOM View Module](https://drafts.csswg.org/cssom-view/)
* Current version: this document

## Context

The [Window object exposes](https://drafts.csswg.org/cssom-view/#extensions-to-the-window-interface) exposes some attributes to describe its size and position in the screen. Currently, there is no way for web authors to track the values of these attributes, other than actively polling.

## Motivation

One potential use case for a feature like this would be to allow a popup dialog opened by a window to keep its relative position with its parent. There is a demo on this repo to show this use case, using a polyfil of the feature.

Although the mentioned use case is doable today, this feature would allow authors to implement it using event handlers as follows:

```js
    const { left, top, isLeft } = computePopupTopLeft();
    const opts = `popup,left=${left},top=${top},width=100,height=100`;
    windowProxy = open("popup.html", "popupDemo", opts);

    window.addEventListener('move',  (e) => {
        windowProxy.window.postMessage(computePopupTopLeft());
    );
```

## Testing

Emulating window ```move``` events is not trivial; the ```window.moveTo```and ```window.moveBy``` require that the target is an auxiliary browser context and it's complex to get the position data to be checked in the tests.

The best approach would be to use the [Set Window Rect](https://www.w3.org/TR/webdriver2/#set-window-rect) and [Get Window Rect](https://www.w3.org/TR/webdriver2/#get-window-rect) WebDriver commands, an defining tests likes this:

```js
promise_test(async t => {
    var expectedRect = {'x': 100, 'y': 200};
    var onMoveCalled = false;
    window.addEventListener("move", function(even) {
        onMoveCalled = true;
    });
    await test_driver.set_window_rect(expectedRect);
    assert_true(onMoveCalled, "The onMove handler has been executed.");
    var rect = await test_driver.get_window_rect();
    assert_equals(rect.x, expectedRect.x, "The window rect X is correct.")
    assert_equals(rect.y, expectedRect.y, "The window rect Y is correct.")
}, "Window move event");
```

## Risks

### Performance

The frequency this new event is fired at may affect the browser's performance; in any case, it should be an asynchronous event as it happens with the ```resize``` event.

One possible approach to mitigate the risk of performance degradation could be to apply an Observer pattern. However, according to the [TAG design principles](https://www.w3.org/TR/design-principles/#events-vs-observers) events should be the preferred solution.

### Privacy and security considerations

Another issue to consider is whether firing this even may reach any element, including iframes.

Tracking the inner position of an iframe may imply security breach, as there is the risk of leaking information about the parent window and its content. In order to mitigate this risk, we could add the restriction of limiting the event to the top-level window.
