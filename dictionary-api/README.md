# Explainer: Dictionary API for handling the browser's custom dictionary

- Contents:
  - [Authors](#authors)
  - [Introduction](#introduction)
  - [Motivation](#motivation)
  - [Design](#design)

## <a name="authors"></a> Authors

* Jihye Hong \<jihye@igalia.com\>

## <a name="introduction"></a> Introduction

The proposed Dictionary APIs make users be able to access the browser's custom dictionary. Users can add, remove, and check words in the custom dictionary.
Also, events are triggered when there is any action related to the custom dictionary.

## <a name="motivation"></a> Motivation

There is a need to add some words to the browser's custom dictionary so that those are not marked as spelling errors by the browser.
The added words need to be removed at some point if those aren't necessary.

Current specs such as [`element.spellcheck` attribute](https://html.spec.whatwg.org/multipage/interaction.html#attr-spellcheck) and [`::spelling-error` CSS pseudo-element](https://drafts.csswg.org/css-pseudo/#selectordef-spelling-error) manage the words already in the dictionary.
Therefore, the new API would be needed to manipulate the custom dictionary.

## <a name="motivation"></a> Proposal

```
enum DictionaryControllerAction {
    "addword",
    "checkword",
    "removeword",
};

[Exposed=Window]
partial interface DictionaryController {
  void addWord(DOMString word, DOMString language);
  void checkWord(DOMString word, DOMString language);
  void removeWord(DOMString word, DOMString language);
};

[Exposed=Window]
interface DictionaryEvent : UIEvent {
    constructor(DOMString type, optional DictionaryEventInit eventInitDict = {});
    readonly attribute DictionaryControllerAction action;
    readonly attribute DOMString word;
    readonly attribute DOMString language;
};

dictionary DictionaryEventInit : UIEventInit {
    DictionaryControllerAction action = null;
    DOMString word = "";
    DOMString language = "";
};
```

- `checkWord()` checks for the words in the custom dictionary
- `addWord()` adds a word to the custom dictionary
- `removeWord()` removes a word from the custom dictionary
- Dictionary Event is triggered when there is any attempt to custom dictionary
- preventDefault() for the event is disabling to access the custom dictionary

### Example

#### Example 1. Manipulate the custom dictionary
```js

\\ Add a word to the dictionary
window.dictionaryController.addWord("IRL", "en-GB");
window.dictionaryController.addWord("TBH", "en-GB");

\\ Delete a word from the dictionary
window.dictionaryController.removeWord("TBH", "en-GB");

```

#### Example 2. Get the dictionary manipulation action from the event

```js


```
