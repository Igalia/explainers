# Canvas Text Metrics for Editing, Art and Design

## <a name="editing-use-cases"></a> Editing Use Cases: Selection and Caret Position for Canvas Text Metrics

Selection and caret position are two building blocks for editing text. Consider the sequence of dragging out a text selection with a mouse or touch, then copying and pasting into a new location. Determining which characters are part of the selection requires mapping a point onto a string, then to a caret position in the text. Drawing the selected region requires the selection area. Inserting again requires mapping a point into a location within a character string.

Both selection bounds and caret position are missing from canvas text metrics and must be implemented today using javascript. Users should be able to interact with canvas-based text input (like Google Docs, VSCode, Miro) in a way that emulates standard DOM content, without developers requiring large javascript solutions.

We propose additional text metrics to enable editing functionality, specifically:
* bounding box for a range, to support hit testing against a sub-range
* mouse position to character index reverse mapping, allowing authors to determine where a caret should be placed within the string.
* selection box geometry indexed by character range (for instance, see this [Stack Overflow question](https://stackoverflow.com/questions/1451635/how-to-make-canvas-text-selectable))

DOM APIs already provide similar functionality, and canvas `measureText` should return equivalent values for equivalent strings and styling to the maximum extent possible. `measureText` will always be limited to a single styled string, and therefore has the potential to be much faster (as it doesn’t need layout).

## <a name="design-use-cases"></a>Uses for Text in Art and Design

In recent years we’ve seen increased demand for better text animation and control in canvas. Of particular concern are text strings where the mapping from character positions to rendered characters is complex or not known at the time of authoring due to font localization.

The use cases include:
* The ability to control how individual graphemes are rendered (over a path or as part of an animation, for example). Consider a case of having text trace the outline of a logo, or letters animating to come together for a word.
* Manipulation of a glyph’s path (text effects, shaping, etc...). Individual characters may be colored diffferently, or custom shaping maybe needed to integrate into a scene.
* Native support for i18n and BiDi layout.

Users should be able to express advanced artistic/animated text rendered into canvas, in a wide array of fonts and languages, comparable to SVG text support.

# <a name="proposal"></a>Proposal: Enhanced Canvas Text Metrics

We propose four new functions on the ```TextMetrics``` interface:

```webidl
dictionary TextClusterOptions {
  DOMString align;
  DOMString baseline;
  double x;
  double y;
};

[Exposed=(Window,Worker)]
interface TextCluster {
    readonly attribute double x;
    readonly attribute double y;
    readonly attribute unsigned long begin;
    readonly attribute unsigned long end;
    readonly attribute DOMString align;
    readonly attribute DOMString baseline;
};

[Exposed=(Window,Worker)] interface TextMetrics {
  // ... extended from current TextMetrics.
  
  unsigned long getIndexFromOffset(double offset);
  
  sequence<DOMRectReadOnly> getSelectionRects(unsigned long start, unsigned long end);
  DOMRectReadOnly getActualBoundingBox(unsigned long start, unsigned long end);

  sequence<TextCluster> getTextClusters(unsigned long start, unsigned long end, optional TextClusterOptions options);
};
```
In addition, a new method on `CanvasRenderingContext2D` supports filling grapheme clusters:
```webidl
interface CanvasRenderingContext2D {
    // ... extended from current CanvasRenderingContext2D.

    void fillTextCluster(TextCluster textCluster, double x, double y, optional TextClusterOptions options);
};
```
The `getIndexFromOffset` method returns the string index for the character at the given `offset` distance (in CSS pixels) from the start position of the text run (accounting for `textAlign` and `textBaseline`) with offset always increasing
left to right (so negative offsets are valid). Values to the left or right of the text bounds will return 0 or
`string.length` depending on the writing direction. The functionality is similar but not identical to [`document.caretPositionFromPoint`](https://developer.mozilla.org/en-US/docs/Web/API/Document/caretPositionFromPoint). In particular, there is no need to return the element containing the caret and offsets beyond the boundaries of the string are acceptable.

The other functions operate in character ranges and return bounding boxes relative to the text’s origin (i.e., `textBaseline`/`textAlign` is taken into account).

`getSelectionRects()` returns the set of rectangles that the UA would render as the selection background when a particular character range is selected.

`getActualBoundingBox()` returns the equivalent to `TextMetric.actualBoundingBox` restricted to the given range. That is, the bounding rectangle for the drawing of that range. Notice that this can be (and usually is) different from the selection rect, as the latter is about the flow and advance of the text. A font that is particularly slanted or whose accents go beyond the flow of text will have a different paint bounding box. For example: if you select this: ***W*** you may see that the end of the W is outside the selection highlight, which would be covered by the paint (actual bounding box) area.

`getTextClusters()` provides the ability to render minimal grapheme clusters (in conjunction with a new method for the canvas rendering context, more on that later). That is, for the character range given as input, it returns the clusters corresponding to the minimal rendering operations broken down as much as logically possible, with their corresponding positional data. The position is calculated with the original anchor point for the text as reference, while the `align` and `baseline` parameters in the options dictionary determine the desired alignment of each cluster.

To actually render these clusters on the screen, a new method for the rendering context is proposed: `fillTextCluster()`. It renders the cluster with the `align` and `baseline` stored in the options object, ignoring the values set in the context. Additionally, to guarantee that the rendered cluster is accurate with the measured text, the rest of the `CanvasTextDrawingStyles` must be applied as they were when `ctx.measureText()` was called, regardless of any changes in these values on the context since. Note that to guarantee that the shaping of each cluster is indeed the same as it was when measured, it's necessary to use the whole string as context when rendering each cluster.

For `align` specifically, the position is calculated in regards of the advance of said grapheme cluster in the text. For example: if the `align` passed to the function is `center`, for the letter **T** in the string **Test**, the position returned will be not exactly be in the middle of the **T**. This is because the advance is reduced by the kerning between the first two letters, making it less than the width of a **T** rendered on its own.

To enable additional flexibility, an options dictionary can be passed to `fillTextCluster()` to override the values for `align`, `baseline`, `x`, and `y` that will be used to render that cluster. For example, calling `ctx.fillTextCluster(cluster, 10, 10, {x: 0, y:0})` will render the cluster exactly at position `(10, 10)`, instead of rendering as if the text as a whole was placed at `(10, 10)` (which is what the internal `x` and `y` values of the cluster represent). This same overriding applies to the `align` and `baseline` parameters if they are passed in the options dictionary. These options passed to `fillTextCluster()` don't modify the underlying cluster object, and only apply to the rendering of that specific call. 

### Bounding Boxes Example

```javascript
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

const tm = ctx.measureText("let's do this");
ctx.fillStyle = "red";
const box_for_second_word = tm.getActualBoundingBox(6, 8);
ctx.fillRect(
      box_for_second_word.x,
      box_for_second_word.y,
      boxForSecondWord.width,
      box_for_second_word.height);
const selection_for_third_word = tm.getSelectionRects(9, 13);
ctx.fillStyle = "lightblue";
for (const s of selection_for_third_word) {
  ctx.fillRect(s.x, s.y, s.width, s.height);
}
ctx.fillStyle = "black";
ctx.fillText("let's do this");
```
Expected output:
!["let's do this" with a red rectangle tighly bounding "do" and a blue rectangle around "this" extending beyond the text](./canvas-text-1.png)

`getSelectionRects()` and `getActualBoundingBox()` can be used on Chrome Canary (starting from version `127.0.6483.0` and `128.0.6573.0` respectively) by enabling the feature with `--enable-features=ExtendedTextMetrics` (or the general `--enable-experimental-web-platform-features`). `getIndexFromOffset()` is recent rename. The previous name was `caretPositionFromPoint()` and is available in Chrome Canary from version `128.0.6587.0`.

### Text Cluster Examples:

```javascript
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

ctx.font = '60px serif';
ctx.textAlign = 'left';
ctx.textBaseline = 'middle';

const text = 'Colors 🎨 are 🏎️ fine!';
let tm = ctx.measureText(text);
let clusters = tm.getTextClusters(0, text.length);

const colors = ['orange', 'navy', 'teal', 'crimson'];
for(let cluster of clusters) {
    ctx.fillStyle = colors[cluster.begin % colors.length];
    ctx.fillTextCluster(cluster, 0, 0);
}
```
Expected output:

![A text string containing emoji with each character colored differently](./text-clusters-output.png).

```js
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext('2d');

const center_x = 250;
const center_y = 250;
const radius = 150;
ctx.font = '50px serif';
ctx.textAlign = 'left';
let text = "🐞 Render this text on a circle! 🐈‍⬛";

const tm = ctx.measureText(text);
// We want the x-position of the center of each cluster. 
const clusters = tm.getTextClusters(0, text.length, {align: 'center'});

for (const cluster of clusters) {
    // Since ctx.textAlign was set to 'left' before measuring, all values of
    // cluster.x are positive.
    let p = cluster.x / tm.width;
    let rad = 2 * Math.PI * p;
    let x = radius * Math.cos(rad) + center_x;
    let y = radius * Math.sin(rad) + center_y;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rad + Math.PI / 2);
    ctx.translate(-x, -y);
    // The cluster is rendered at precisely (x, y), using align as 'center'
    // and baseline as 'middle', even if different values were used when
    // measuring.
    ctx.fillTextCluster(cluster, x, y,
        {align: 'center', baseline: 'middle', x: 0, y: 0});
    ctx.restore();
}
```

Expected output:

![A text string containing emoji rendered in a circle, with each glyph rotated according to its position](./text-clusters-circle.png)

### Editing Example

An toy text editor making use of these features is available at https://blogs.igalia.com/schenney/html/editing-canvas-demo.html

### Availability

`getTextClusters()` and `fillTextCluster()` can be used on Chrome Canary (starting from version `132.0.6783.0`) by enabling the feature with `--enable-features=ExtendedTextMetrics` (or the general `--enable-experimental-web-platform-features`). The other additions are available from Chrome 128, using the flag listed above.

## Alternatives considered
### DOM Element inputs
Instead of a plain string, the `TextCluster` API could take an `Element` wrapper.

#### Pros
* Access to full CSS styling capabilities for text, beyond what is currently available in Canvas.
* Potentially improved accessibility.

#### Cons
##### High-level considerations
Sophisticated clients (e.g. FlutterWeb or Google Docs), which stand to benefit most from this proposal, already implement bespoke a11y solutions in higher layers.  Enforcing a11y at this level is unnecessary in their case, and would result in unneeded friction.

More generally, a11y at this level runs into a couple of issues:

1) **Scoping/granularity**: the `TextMetrics` API is a low-level utility that doesn’t necessarily receive a full semantic payload in a single call.  Clients may decide to break down the input text for rendering in various ways (e.g. small view into a larger paragraph, streaming text, etc), and they may not even measure the fragments in a semanticly-meaningful order.

2) **Metrics-vs-presentation sequencing**: a `measureText` call does not render any text by itself, and activating the a11y machinery at that stage seems fragile.  The client may decide to defer rendering, to only render parts of the string, or to not render at all (measuring for other purposes).

##### API ergonomics
`TextMetrics.getTextClusters()` returns input-domain indices, in order to surface character-cluster -> glyph-cluster mapping information to clients.  If the input string is to be presented as a DOM element, the semantics become more convoluted - how do we convey indexing information for element-wrapped text?  One possible solution is to return [`CaretPositions`](https://developer.mozilla.org/en-US/docs/Web/API/CaretPosition), which would potentially allow reconstructing the indices in the character domain.  Since clients start with a string, these additional transformations introduce friction and create opportunities for errors.

The current proposal is also incremental, meant to minimize the affected API surface area.  As such, it piggy-backs on the existing [`CanvasRenderingContext2D.measureText()`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/measureText) API, which takes a string input.  Changing the input to an element would require more extensive API updates.

##### Performance concerns
* Overhead for measuring text presented as an Element: unlike the low level version of the proposal, the high-level/Element version activates additional implementation layers which add up to non-trivial overhead (CSS resolution, layout).

* Overhead for allocating/managing DOM elements.

### HTML-in-Canvas

Use [HTML-in-Canvas](https://github.com/WICG/html-in-canvas) (formerly known as `placeElement`/`drawElement`) as a general solution for sophisticated text rendering in Canvas.

#### Pros
Potentially more accessible, full CSS capabilities.

#### Cons
While there is some overlap, HTML-in-Canvas does not address some of the core/complex text shaping use cases supported by `TextMetrics`/`TextCluster`.  Specifically, the ability to draw clusters in isolation, with different transforms/positioning than originally measured.

HTML-in-Canvas is also in the proposal stages, and the availability/timeline is unclear.

The same performance concerns apply.
