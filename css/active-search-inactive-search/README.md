# Explainer:  CSS pseudo-elements `::active-search` and `::inactive-search`

- Contents:
  - [Authors](#authors)
  - [Introduction](#introduction)
  - [Motivation](#motivation)
  - [Design](#design)

## Authors

* Jihye Hong \<jihye@igalia.com\>

## Introduction

`::active-search` and `::inactive-search` allow styling the highlighted fragments shown when using find-in-page different from the default UA highlighting.

Those pseudos are classified as [highlight Pseudo-elements](https://drafts.csswg.org/css-pseudo/#highlight-pseudos),
so they follow the same mechanism as other highlight pseudo-elements.
They can be styled by [a limited set of CSS properties](https://drafts.csswg.org/css-pseudo/#highlight-styling)
and represent the active portions of the [highlight overlays](https://drafts.csswg.org/css-pseudo/#highlight-overlay).

* This document status: Active
* Current version: this document
* Related Spec: [Highlight Pseudo-elements](https://drafts.csswg.org/css-pseudo/#highlight-pseudos)

## Motivation

Authors should be able to customize the highlighted text from find-in-page to have the style match that of the rest of the page.
There is a [proposal in CSSWG](https://github.com/w3c/csswg-drafts/issues/3812) to add new pseudo-elements related to find-in-page feature.
Two pseudos are proposed as browsers differentiate between the currently active search result and other search results.

## Proposed Syntax

```css
::active-search {
  /* ... */
}

::inactive-search {
  /* ... */
}
```

## Example

```css
::active-search {
  background-color: purple;
  color: white;
}

::inactive-search {
  background-color: gray;
  color: black;
}
```

## Risks

### Compatability

Find-in-page UIs vary across browsers.
For example,

- Chrome
  - Page loads and renders
  - Page scrolls to the fragment match, and highlights it with a background color that is the same as the Chromium find-in-page UA feature's non-active match (*) color (currently yellow). If that find-in-page color changes in different modes of the browser, the fragment match color should also already be changing to match it
  - The highlight is removed instantly if the user clicks the 'x' button in find-in-page UI. There is no animation
  
  (*) find-in-page has two highlight colors: the active match and the non-active match. 

- Safari
  - Page loads and renders
  - Page is filtered with gray with fading out animation and scrolls to the fragment match. The matched fragments are highlighted with a background color and those aren't filtered with gray.
  - The highlight is removed instantly if the user clicks on the page and the page turns into its initial background with fading in animation
  
  (*) find-in-page has two highlight colors: the active match and the non-active match.

### Priority of the highlight pseudo-elements

This isn't a risk per se, but it needs to define a default priority for `::active-search` and `::inactive-search` among all highlight pseudo-elements.
It matters when authors use them with one of the other highlight pseudos.

There is a [related discussion in CSSWG](https://github.com/w3c/csswg-drafts/issues/4594).

