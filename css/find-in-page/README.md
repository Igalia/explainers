# Explainer: CSS highlight pseudos for find-in-page results

- Contents:
  - [Authors](#authors)
  - [Introduction](#introduction)
  - [Motivation](#motivation)
  - [Design](#design)

## <a name="authors"></a> Authors

* Jihye Hong \<jihye@igalia.com\>
* Stephen Chenney \<schenney@igalia.com\>
* Delan Azabani \<dazabani@igalia.com\>

## <a name="introduction"></a> Introduction

`::search-text` allows for CSS styling of the search results shown when using a browser’s find-in-page feature.

The proposed pseudo element is classified as [Highlight Pseudo-elements](https://drafts.csswg.org/css-pseudo/#highlight-pseudos), and it follows the same rules as other highlight pseudo-elements.
That is, they can be styled by [a limited set of CSS properties](https://drafts.csswg.org/css-pseudo/#highlight-styling), represent the active portions of their [highlight overlays](https://drafts.csswg.org/css-pseudo/#highlight-overlay), and use the [highlight inheritance model](https://drafts.csswg.org/css-pseudo/#highlight-cascade).

* This document status: Active
* Current version: this document
* Related Spec: [Highlight Pseudo-elements](https://drafts.csswg.org/css-pseudo/#highlight-pseudos)

## <a name="motivation"></a> Motivation

Authors would like to customize the highlighted text from find-in-page to have a style consistent with that of the rest of the page. In particular, the existing find-in-page highlights may offer poor contrast, harming accessibility.
There is an existing [proposal in the CSSWG](https://github.com/w3c/csswg-drafts/issues/3812) to add new highlight pseudos for find-in-page results.

Web developers have asked related questions on [Stack Overflow](https://stackoverflow.com/search?q=%5Bcss%5D+find-in-page),
though they do not have many votes:

* [Someone directly asks for CSS styling of find-in-page](https://stackoverflow.com/questions/50309703/css-for-browsers-find-in-page).
* [Another direct question](https://stackoverflow.com/questions/18666075/how-to-style-detect-highlighted-boxes-generated-from-browser-native-search-in-pa).
* [A user wants to hide find-in-page results](https://stackoverflow.com/questions/77458310/confuse-browsers-in-built-find-in-page-feature) and could do so by styling them as transparent.

## Proposed Syntax

[We propose](https://github.com/w3c/csswg-drafts/issues/10212) adding a single highlight pseudo [with a pseudo-class](https://drafts.csswg.org/selectors/#pseudo-element-states) to distinguish the current match.
Browsers differentiate between the currently matched search result and other search results, but these states are mutually exclusive, so they need not be two separate pseudo-elements and highlight overlays.

```css
::search-text {
  /* Styles for all search results */
}
::search-text:current {
  /* Styles for the active search result */
}
::search-text:not(:current) {
  /* Styles for other search results */
}
```

[The CSS Working Group resolved](https://github.com/w3c/csswg-drafts/issues/10213) that find-in-page highlights paint either immediately above or immediately below `::selection` highlights to allow for behavior that matches current implementations.
Painting them over ::target-text reflects an explicit user intent to identify the search string that is stronger than ::target-text; for ::target-text, you only need to click on a link. Broswers currently clear the selection when entering the find-in-page UI, but a user may select when in that UI. In such cases the selection intent is more recent then that search intent and we expect the selection to paint over the search text. This
provides compat with [current Firefox and Chrome behaviour](https://github.com/w3c/csswg-drafts/issues/3812#issuecomment-2047241516).

We do not propose that find-in-page highlight styles have any effect on the tick marks that are sometimes shown in the default browser scrollbars.

## Example

```css
::search-text {
  background-color: purple;
  color: white;
}
::search-text:current {
  background-color: gray;
}
```

## Risks

### Compatibility

Find-in-page UIs vary across browsers. For example,

- Chrome
  - Searches are found and updated as the user types their search string
  - The page scrolls to the first match, highlighted in yellow, the active match color, and any active selection is cleared.
  - All matches are marked with bars in the default scrollbar
  - Any additional matches are marked with an inactive match color (orange)
  - Using the browser UI to find the next match moves the active match to the next
  - Selecting when in the find-in-page UI state results in the selection highlight painting over the search text
  - The behavior is not entirely consistent, sometimes showing multiple fragments as matching, or scrolling away from a match.

- Safari
  - The browser UI allows for varying the search behavior
  - As the user enters a string, the first active matche is found, highlighted in yellow, the remainder of the page is covered by a dark overlay and any selection is cleared.
  - Additional matches are shown in white on the darkened page.
  - The browser UI allows for moving from one match to the next.
  - When the find-in-page browser UI is exited, the current match is converted to the selection and all other matches disappear.
  - The behavior is not entirely consistent in that sometimes inactive matches are not shown, and sometimes the page ceases to be darkened while still in the find-in-page UI.

- Firefox
  - The browser UI allows for varying the search behavior
  - As the user enters text, the match is highlighted in purple (the inactive match color) and the selection is cleared.
  - Using an arrow in the UI makes a match active, turning the highlight green
  - If "Highlight All" is checked in the UI, all inactive matches are shown in purple, with an active one in green
  - Selecting when in the find-in-page UI state results in the selection highlight painting over the search text
  - The behavior is the most consistent of the browsers discussed here.
 
The Safari behavior is the biggest risk to achieving compatibility.
There may be limitations as to how the highlight may be styled given that it must be rendered over the top of an otherwise darkened page.
For this reason the spec will not require UAs to implement the `::search-text` pseudo, but if they do imeplement they must implement the spec defined behavior.
