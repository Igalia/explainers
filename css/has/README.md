# Explainer:  CSS selector `:has()` pseudo class

- Contents:
  - [Author](#author)
  - [Participate](#participate)
  - [Introduction](#introduction)
  - [Motivation](#motivation)
  - [Design](#design)

## Author

* Byungwoo Lee \<blee@igalia.com\>
* Brian Kardell \<bkardell@igalia.com\>
* Manuel Rego \<rego@igalia.com\>

## Participate

* [Chromium bug #1207894](https://bugs.chromium.org/p/chromium/issues/detail?id=1207894)

## Introduction
`:has()` pseudo class is specified in the [4.5. The Relational Pseudo-class: ':has()'](https://www.w3.org/TR/selectors-4/#relational) section of the [Selector Level 4](https://www.w3.org/TR/selectors-4) as below.

> The relational pseudo-class, `:has()`, is a functional pseudo-class taking a relative selector list as an argument.

> It represents an element if any of the relative selectors, when absolutized and evaluated with the element as the :scope elements, would match at least one element.

According to the spec, the `:has()` selector takes [relative selector](https://www.w3.org/TR/selectors-4/#relative-selector) list as an argument, so supports following cases as the spec shows.
 * a:has(> img) : Matches only `<a>` elements that contain an `<img>` child
 * dt:has(+ dt) : Matches a `<dt>` element immediately followed by another `<dt>` element

## Motivation

The :has() pseudo class is a selector that specifies elements which has at least one element that matches the relative selector passed as an argument.

Unlike other selectors, it gives a way to apply a style rule to preceding elements (preceding siblings / ancestors / preceding siblings of ancestors) of a certain elements.

```html
<style>
.parent:has(.red) { color: red }
.parent:has(.green) { color: green }
</style>

<div class="parent"> <!-- color: red -->
  <div class="red"/>
</div>
<div class="parent"> <!-- color: green -->
  <div class="green"/>
</div>
```

This difference is attractive to web develpers, but also it generates lots of concerns mainly about performance and complexity. So there have been discussion about these over the years, but it was difficult to get those discussion moving forward.

It is true that it can generate performance issues and complex cases. But it is also true that there have been clear demands for the usage.

We thought that, clarifying those concerns would be helpful for the discussion. So we started to check feasibility on blink, and were able to get some meaningful and reasonable results from this step. Based on the results, we are going to move forward by prototyping.

With the prototyping, we want to break down the large and complex problems into smaller ones, create solutions to the smaller problems, then create the feasible ways to extend it into large and complex problems again, and then see the results. And we hope that the results will give us a clear understanding of what affects how much performance, and what makes how complex problems.

## Design

### `:has()` pseudo class matching
`:has()` pseudo class matching approach is simply described in the [has pseudo class matching](has-pseudo-class-matching.md).

###  Style invalidation for `:has()` pseudo class
Style invalidation approach for `:has()` is described in the [has style invalidation](has-style-invalidation.md). You can get the most details about the :has style invalidation from here.

The approach follows the idea of the blink style invalidation. The [blink css style invalidation](blink-css-style-invalidation.md) simply summarized the [design documents](https://chromium.googlesource.com/chromium/src/+/refs/tags/90.0.4430.54/third_party/blink/renderer/core/css/style-invalidation.md).

In the [prototyping details](prototyping-details.md), you can get the detailed design of the `:has()` invalidation prototyping.