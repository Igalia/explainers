# Anchor Element for `window.open()` — Explainer

## Authors

- Cathie Chen (Igalia)

## Status

Prototype / Early Exploration

---

## Introduction

Web applications frequently open popup windows or tool panels that are logically associated with a triggering element on the page — a button, a link, an icon. Today there is no standard way to tell the browser *where* to position that new window relative to the element that opened it. Developers must manually compute screen coordinates, which requires knowledge of the element's absolute position on the screen (not just inside the viewport), the window UI dimensions of the host browser, and display scaling — information that is either unavailable, unreliable, or a privacy concern to expose.

This proposal introduces a set of `window.open()` feature tokens that let a page declare an **anchor element** and a desired alignment, and let the browser compute the final position — all without leaking the anchor element's absolute screen coordinates to the opener page.

---

## Motivation and Use Cases

### Use Case 1: Tooltip / popover panel

A design tool renders a floating property inspector when the user clicks a layer name. The inspector should open flush with the right edge of the element that was clicked, aligned to its top.

```js
const btn = document.getElementById('layer-name');
window.open(
  '/inspector',
  '_blank',
  `anchorelement=#layer-name,anchorhorizontalalign=right,anchorverticalalign=top,width=320,height=480`
);
```

### Use Case 2: Dropdown-style submenu

A nav bar item opens a submenu window centered below itself:

```js
window.open(
  '/submenu',
  '_blank',
  `anchorelement=#nav-products,anchorhorizontalalign=center,anchorverticalalign=bottom,width=240,height=300`
);
```

### Use Case 3: Overflow-safe popup with flip

A chat "emoji picker" opens to the right of a button, but flips to the left side if there is not enough space on the right:

```js
window.open(
  '/emoji-picker',
  '_blank',
  `anchorelement=#emoji-btn,anchorhorizontalalign=right,anchorflipifneeded=1,width=280,height=360`
);
```

### Use Case 4: Financial trading platform — instrument detail panel

A trading platform shows a watchlist of ticker symbols. Clicking the "Details" button next to a ticker opens a detailed data table (price history, order book, key stats) to the **left** of the button, vertically aligned to its top edge. Because the watchlist is on the right side of the screen, opening to the left avoids pushing the panel off-screen.

```js
let button_width = document.getElementById('details-btn-AAPL').getBoundingClientRect().width;
let anchor_offset = 0 - button_width - 8;// 8 px gap between panel and button
document.getElementById('details-btn-AAPL').addEventListener('click', () => {
  window.open(
    '/instrument-detail?ticker=AAPL',
    '_blank',
    `anchorelement=#details-btn-AAPL,` +
    `anchorhorizontalalign=right,` +  // right edge of viewport aligns with right edge of button
    `anchorhorizontaloffset=${anchor_offset},` +  // don't let window covering the button
    `anchorverticalalign=top,` +
    `width=480,height=600,` +
    `anchorflipifneeded=1`            // flip to the right if there is not enough space on the left
  );
});
```

`anchorhorizontalalign=right` places the viewport's right edge flush with the button's right edge; because the panel is wider than the button, it extends to the left. The negative `anchorhorizontaloffset` adds a small gap + button width so that the button is not covered by the window. `anchorflipifneeded=1` lets the browser flip to the right side if the panel would overflow the left edge of the display.

---

## Proposed API

The anchor element feature is expressed through a set of tokens in the `windowFeatures` string passed to `window.open()`.

### Tokens

| Token | Values | Default | Description |
|---|---|---|---|
| `anchorelement` | CSS selector (URL-encoded) | — | Identifies the element to anchor the new window to. The selector is evaluated in the opener's document and must match exactly one element that generates a box; otherwise anchor positioning is skipped with a console warning. `width` and `height` must also be given. |
| `anchorhorizontalalign` | `left` \| `center` \| `right` | `left` | Horizontal alignment of the new window's viewport relative to the anchor element. |
| `anchorverticalalign` | `top` \| `middle` \| `bottom` | `top` | Vertical alignment of the new window's viewport relative to the anchor element. |
| `anchorhorizontaloffset` | integer (px) | `0` | Additional horizontal offset applied after alignment. |
| `anchorverticaloffset` | integer (px) | `0` | Additional vertical offset applied after alignment. |
| `anchorflipifneeded` | `0` \| `1` | `0` | When `1`, the browser mirrors an alignment to the opposite edge of the anchor if the window would overflow the display's work area in the direction it extends, and only if the mirrored position fits. Centered alignments never flip. |
| `anchorflippedhorizontaloffset` | integer (px) | same as `anchorhorizontaloffset` negated | Horizontal offset to use when the window is flipped horizontally. |
| `anchorflippedverticaloffset` | integer (px) | same as `anchorverticaloffset` negated | Vertical offset to use when the window is flipped vertically. |

### Alignment semantics

The renderer resolves the selector to the element's bounding box in the coordinate space of the opener's widget, in device-independent pixels, with page zoom, pinch-zoom and the position of enclosing same-process iframes applied. The browser process adds the opener widget's screen position, which it knows for top-level frames and out-of-process iframes alike, and aligns the new window's **viewport** (not the outer window frame) to the resulting rectangle. The offsets are given in CSS pixels of the opener and are converted with the same scale.

#### Horizontal alignment

| `anchorhorizontalalign` | Meaning |
|---|---|
| `left` | The left edge of the new window's viewport aligns with the left edge of the anchor element. |
| `center` | The new window's viewport is horizontally centered over the anchor element. |
| `right` | The right edge of the new window's viewport aligns with the right edge of the anchor element. |

#### Vertical alignment

| `anchorverticalalign` | Meaning |
|---|---|
| `top` | The top edge of the new window's viewport aligns with the top edge of the anchor element. |
| `middle` | The new window's viewport is vertically centered over the anchor element. |
| `bottom` | The bottom edge of the new window's viewport aligns with the bottom edge of the anchor element. |

### Example: align viewport to anchor

```
anchor element rect (in viewport): x=100, y=200, width=80, height=30
window size:                        width=320, height=400
anchorhorizontalalign=center
anchorverticalalign=bottom
```

Computed viewport origin (before display fit):
- x = anchor_left + (anchor_width − window_width) / 2
     = 100 + (80 − 320) / 2 = 100 − 120 = **−20**
- y = anchor_top + anchor_height − window_height
     = 200 + 30 − 400 = **−170**  *(window sits above the anchor)*

In this case, the computed viewport rect overflows the display. With `anchorflipifneeded=1` the `bottom` alignment is mirrored to `top` (y = 200) because the window extends upwards and overflows the top edge, and the mirrored position fits. Without it, the browser clamps the rect to the display work area (`AdjustToFit`), as it does for any explicit `left`/`top`.

---

## Privacy Considerations

### Why align the viewport, not the window frame?

Developers think in terms of content: "put the panel's content flush with this button". Aligning the outer frame would make the result depend on the host browser's toolbar and border sizes, which the page cannot know and which differ per platform. Aligning the viewport gives a predictable result and lets the page keep its own content from covering the anchor with a plain CSS-pixel offset.

This choice does not by itself hide the anchor's screen position. A top-level page can already estimate the screen position of its own elements from `screenX`/`screenY` together with the difference between its outer and inner size, and the opened window's `screenX`/`screenY` continue to report the outer frame position exactly as they do today. The feature is therefore designed so that it adds **no new information** rather than removing existing information:

- the resolved anchor rectangle is computed in the renderer and consumed in the browser process; it is never handed back to script;
- cross-origin iframe content cannot be targeted (see below), so the opener cannot learn where cross-origin content is laid out;
- the final window bounds are clamped and adjusted by the browser like any explicit `left`/`top`.

### Selector scope

The `anchorelement` token accepts a CSS selector that is evaluated in the context of the opener document. Cross-origin frames cannot be targeted. If the selector is invalid, does not match any element, matches more than one element, or matches an element without a box, the feature is ignored and a console warning is logged. `window.open()` itself never throws because of the anchor.

### No new capabilities for the opener

The opener page does not receive the resolved anchor rect in screen coordinates; it only provides a selector and alignment preferences. The browser resolves the position internally. This keeps the API surface narrow and avoids exposing any new screen-coordinate information to script.

---

## Key Design Decisions

### Viewport alignment over window alignment

As described in the privacy section, aligning the viewport is both safer and more useful from a developer perspective. Developers think in terms of content, not UI window. In the complex scenarios, the popup window could be frameless.

### CSS selector, not element reference

`window.open()` is a string-based API and there is no standard way to pass a live DOM element reference through a feature string. A CSS selector is the most natural encoding.

### Integer pixel coordinates

The anchor rectangle is scaled to device-independent pixels in the renderer and rounded once before it crosses the IPC boundary, consistent with the existing `x`, `y`, `width`, and `height` feature tokens. Sub-pixel positioning of windows is not supported.

### `flip-if-needed` and separate flipped offsets

Callers often want a different offset when the window flips. The API accepts optional `anchorflippedhorizontaloffset` / `anchorflippedverticaloffset` tokens that override the base offset when a flip is applied. If the flipped offset tokens are omitted, the browser negates the base offset as a sensible default.

---

## Alternatives Considered

### Expose `screenX`/`screenY` of the anchor element

The most direct solution would be to give the page the element's screen coordinates so it can pass them to `window.open()` as `left` and `top`. This was rejected because it exposes absolute screen position, which is considered a fingerprinting/privacy risk and is inconsistent with the direction of restricting screen coordinate APIs.

### CSS Anchor Positioning (inline popups)

[CSS Anchor Positioning](https://drafts.csswg.org/css-anchor-position/) solves a similar problem for elements within the same document. It does not apply to separately-opened windows, which have their own top-level browsing context, operating system window frame and could be placed outside of the boundary of the opener.

### Post-message / `window.moveTo()`

A page could open a window at a default location, then use `postMessage` to send it coordinates and call `window.moveTo()` from inside the new window. This works today but requires coordination between two origins, is asynchronous (causing a visible jump), and requires the inner page to cooperate. It also suffers from the same coordinate-leakage concern if absolute screen coords are used.

---

## Security Considerations

- The `anchorelement` selector is evaluated in the opener document and never transmitted to the opened window.
- No new cross-origin data flows are introduced.
- The positioning computation runs entirely in the browser process. The renderer provides only the bounding rect of the locally-matched element.
- Display overflow clamping (`AdjustToFit`) is applied after anchor positioning, so an anchor element near a screen edge cannot force the new window off-screen.

---

## Open Questions

1. **Token naming.** The prototype accepts a single spelling per token, all lowercase without separators, matching existing `window.open()` features such as `innerwidth` and `noopener`. Whether the final names should be shorter is open.

2. **Failure mode.** If the selector matches no element or more than one element, or `width`/`height` are missing, the window opens at the browser's default position and a console warning is logged. Should there be a way for the opener to detect this programmatically (e.g. a promise-based API extension)?

3. **Dynamic anchors.** Should the feature support re-anchoring a window when the element moves (e.g. on scroll)? The current design is a one-shot snapshot at open time.

4. **Interaction with `screenX`/`screenY` restrictions.** Some browsers already clamp or quantize `window.screenX`/`screenY` for privacy. This feature should be evaluated against those restrictions to ensure it does not re-introduce the information it aims to conceal.

5. **Coordinate space.** Anchor rects are captured in the opener widget's device-independent pixels (page zoom, pinch-zoom and iframe offsets applied) and offset by the widget's screen position in the browser process, so `devicePixelRatio` and display scaling do not affect the result. Whether offsets should be interpreted in CSS pixels of the opener (current) or in device-independent pixels is open.

---

## References

- [CSS Anchor Positioning — W3C Draft](https://drafts.csswg.org/css-anchor-position/)
- [`window.open()` — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/open)
- [Popup API (Popover)](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API)
- [Screen enumeration and screen-detailed APIs](https://github.com/w3c/window-management)
