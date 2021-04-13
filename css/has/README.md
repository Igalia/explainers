# :has() pseudo class

## 1. Specification
`:has()` pseudo class is specified in the [4.5. The Relational Pseudo-class: ':has()'](https://www.w3.org/TR/selectors-4/#relational) section of the [Selector Level 4](https://www.w3.org/TR/selectors-4) as below.

> The relational pseudo-class, `:has()`, is a functional pseudo-class taking a relative selector list as an argument.

> It represents an element if any of the relative selectors, when absolutized and evaluated with the element as the :scope elements, would match at least one element.

According to the spec, the `:has()` selector takes [relative selector](https://www.w3.org/TR/selectors-4/#relative-selector) list as an argument, so supports following cases as the spec shows.
 * a:has(> img) : Matches only `<a>` elements that contain an `<img>` child
 * dt:has(+ dt) : Matches a `<dt>` element immediately followed by another `<dt>` element

## 2. :has() selector matching
`:has()` selector matching is simply described in the [has pseudo class matching](has-pseudo-class-matching.md).

## 3. Style invalidation with :has()
Style invalidation approach for `:has()` is described in the [has style invalidation](has-style-invalidation.md). You can get the most details about the :has style invalidation from this.

The approach follows blink style invalidation idea. The [blink css style invalidation](blink-css-style-invalidation.md) simply summarized the design document.

In the [prototyping details](prototyping-details.md), you can get the detailed design of the `:has()` invalidation prototyping.