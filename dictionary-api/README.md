# Explainer: Dictionary API for handling the browser's custom dictionary

- Contents:
  - [Authors](#authors)
  - [Introduction](#introduction)
  - [Motivation](#motivation)
  - [Proposal](#proposal)
  - [Security and Privacy Considerations](#security)
  - [Future Work](#future)
  - [Discussion](#discuss)

## <a name="authors"></a> Authors

* Jihye Hong \<jihye@igalia.com\>

## <a name="introduction"></a> Introduction

The proposed Dictionary APIs enable users to modify the custom dictionary provided by the browser. Users can add, remove, and check words in the custom dictionary.
This feature ensures that the words in the custom dictionary won't be marked as spelling errors by the browser. 

## <a name="motivation"></a> Motivation

Some words need to be added to the browser's custom dictionary so that the browser does not mark them as spelling errors.

Some websites focus on specific topics. For instance, a website dedicated to Pokémon might feature the names of various Pokémon characters, such as Pikachu and Charmander. Similarly, some websites provide information about South Korea and may include Korean words or terms presented in English pronunciation. In both cases, the words mustn't be presented as spelling errors.

The added words need to be removed at some point if those aren't necessary.

Current specs such as [`element.spellcheck` attribute](https://html.spec.whatwg.org/multipage/interaction.html#attr-spellcheck) and [`::spelling-error` CSS pseudo-element](https://drafts.csswg.org/css-pseudo/#selectordef-spelling-error) manage the words already in the dictionary.
Therefore, the new API would be needed to manipulate the custom dictionary.

## <a name="proposal"></a> Proposal

### Syntax
```
[Exposed=Window]
partial interface CustomDictionaryController {
  void addWord(DOMString word, DOMString language);
  boolean hasWord(DOMString word, DOMString language);
  void removeWord(DOMString word, DOMString language);
};
```

- `hasWord()` checks for the words in the custom dictionary. Returns `true` if a word is already in the custom dictionary.
- `addWord()` adds a word to the custom dictionary
- `removeWord()` removes a word from the custom dictionary


### Data Storage
In terms of minimizing the risk of data leakage, the data related to the custom dictionary is managed by non-persistent browser sessions.

### Example

#### Example 1. Manipulate the custom dictionary
```js

// Add a word to the dictionary
window.customDictionaryController.addWord("IRL", "en-GB");
window.customDictionaryController.addWord("TBH", "en-GB");

// Delete a word from the dictionary
window.customDictionaryController.removeWord("TBH", "en-GB");
```

## <a name="security"></a> Security and Privacy Considerations
The custom dictionary data won't be loaded cross-origin. User agents must use the potentially [CORS-enabled fetch method](https://fetch.spec.whatwg.org/#http-cors-protocol) to implement this feature.

## <a name="future"></a> Future Work
### Persistently store data
To enrich the user experience, the data needs to be stored persistently inside the browser.
Using a scheme such as IndexedDB is under consideration.

## <a name="discuss"></a> Discussion
