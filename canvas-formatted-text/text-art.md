# Canvas Supporting Text in Art and Design

## <a name="use-cases"></a>Text in Art and Desiogn

In recent years we’ve seen increased demand for better text animation and control in canvas. Of particular concerns are text strings where the mapping from character positions to rendered characters is complex or not known at the time of authoring due to font localization.

The use cases include:
* The ability to control how individual graphemes are rendered (over a path or as part of an animation, for example). Consider a case of having text trace the outline of a logo, or letters animating to come together for a word.
* Manipulation of a glyph’s path (text effects, shaping, etc...). Individual characters may be colored diffferently, or custom shaping maybe needed to integrate into a scene.
* Native support for i18n and BiDi layout.

Users should be able to express advanced artistic/animated text rendered into canvas, in a wide array of fonts and languages, comparable to SVG text support.

# <a name="proposal"></a>Proposal: Grapheme Cluster Support

We propose supporting the ability to render minimal grapheme clusters.

```c-like
[Exposed=(Window,Worker)] interface TextMetrics {
  // ... extended from current TextMetrics.
  
  RenderingCluster getTextRenderForRange(unsigned long start, unsigned long end);
};

interface RenderingCluster {
  readonly attribute double x;
  readonly attribute double y;
  readonly attribute long begin;
  readonly attribute long end; 
}
```

This function would return the text rendering operation needed to identically reproduce the original text, broken down as much as the UA is able to (for example, keeping ligatures or NZJ emojis together) that fully includes the interval passed. This means that:

```javascript
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

const text = "😀AWAY";
ctx.font = "800 20px Arial";
const tm = ctx.measureText(text);

let pos = 0;
while (pos < text.length) {
  const rc = tm.getTextRenderForRange(pos, pos + 1);
  ctx.fillStyle = `hsl(216, ${77 * pos / text.length}, ${58 * pos/ length})`;
  ctx.fillText(text.substring(rc.begin, rc.end), rc.x, rc.y);
  // we try to render one char, but that may not always be possible.
  pos = rc.end;
}
```

outputs

![A smiley face followed by "AWAY" with a gradient fill](./canvas-text-as-art.png).

### Follow up proposals

Additional features for "Text as Art" might include better path control and manipulation on the web (border selection, path operations, inspection and manipulation, etc...), and better Font rendering to Path translations, and better font/shaping information.

