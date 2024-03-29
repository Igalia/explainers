# Explainer:  CSS pseudo-elements `::active-search` and `::inactive-search`

- Contents:
  - [Authors](#authors)
  - [Introduction](#introduction)
  - [Motivation](#motivation)
  - [Design](#design)

## Authors

* Jihye Hong \<jihye@igalia.com\>
* Stephen Chenney \<schenney@igalia.com\>

## Introduction

`::active-search` and `::inactive-search` allow CSS styling of the highlighted fragments shown when using a browsers find-in-page feature.

The proposed pseudo elements are classified as [Highlight Pseudo Elements](https://drafts.csswg.org/css-pseudo/#highlight-pseudos), and they follow the same mechanism as other highlight pseudo-elements. That is, they can be styled by [a limited set of CSS properties](https://drafts.csswg.org/css-pseudo/#highlight-styling), represent the active portions of the [highlight overlays](https://drafts.csswg.org/css-pseudo/#highlight-overlay) and use the [Highlight Inheritance model](https://drafts.csswg.org/css-pseudo/#highlight-cascade).

The search highlight pseudos do not modify the tick marks sometimes shown in the default browser scrollbars.

* This document status: Active
* Current version: this document
* Related Spec: [Highlight Pseudo-elements](https://drafts.csswg.org/css-pseudo/#highlight-pseudos)

## Motivation

Authors would like to customize the highlighted text from find-in-page to have a style consistent with that of the rest of the page. In particular, the existing find-in-page highlights may offer poor contrast, harming accessibility.
There is an existing [proposal in the CSSWG](https://github.com/w3c/csswg-drafts/issues/3812) to add new pseudo-elements related to find-in-page feature.
Two pseudos are proposed as browsers differentiate between the currently active search result and other search results.

Web developer have asked related questions on [Stack Overflow](https://stackoverflow.com/search?q=%5Bcss%5D+find-in-page),
though they do not have many votes:
* [Someone directly asks for CSS styling of find-in-page](https://stackoverflow.com/questions/50309703/css-for-browsers-find-in-page).
* [Another direct question](https://stackoverflow.com/questions/18666075/how-to-style-detect-highlighted-boxes-generated-from-browser-native-search-in-pa).
* [A user wants to hide find-in-page results](https://stackoverflow.com/questions/77458310/confuse-browsers-in-built-find-in-page-feature) and could do so by styling them as transparent.

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

### Compatibility

Find-in-page UIs vary across browsers. For example,

- Chrome
  - Searches are found and updated as the user types their search string
  - The page scrolls to the first match, highlighted in yellow, the active match color
  - All matches are marked with bars in the default scrollbar
  - Any additional matches are marked with an inactive match color (orange)
  - Using the browser UI to find the next match moves the active match to the next
  - The behavior is not entirely consistent, sometimes showing multiple fragments as matching, or scrolling away from a match.

- Safari
  - The browser UI allows for varying the search behavior
  - As the user enters a string, the first active matche is found, highlighted in yellow, and the remainder of the page is darkened.
  - Additional matches are shown in white on the darkened page.
  - The browser UI allows for moving from one match to the next.
  - When the find-in-page browser UI is exited, all matches disappear.
  - The behavior is not entirely consistent in that sometimes inactive matches are not shown, and sometimes the page ceases to be darkened while still in the find-in-page UI.

- Firefox
  - The browser UI allows for varying the search behavior
  - As the user enters text, the match is highlighted in purple (the inactive match color)
  - Using an arrow in the UI makes a match active, turning the highlight green
  - If "Highlight All" is checked in the UI, all inactive matches are shown in purple, with an active one in green
  - The behavior is the most consistent of the browsers discussed here.
 
The Safari behavior is the biggest risk to achieving compatibility. There may be limitations as to how the highlight may be styled given that it must be rendered over the top of an otherwise darkened page.

### Priority of the highlight pseudo-elements

This isn't a risk per se, but a default priority for `::active-search` and `::inactive-search` among all highlight pseudo-elements must be defined. We propose that the search highlights paint over everything except selection, due to the fact that it reflects a distinct user intent to identify the search string and should not be obscured.

There is a [related discussion in CSSWG](https://github.com/w3c/csswg-drafts/issues/4594).

