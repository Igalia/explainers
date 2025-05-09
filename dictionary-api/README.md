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
This feature ensures the browser does not mark words in the custom dictionary as spelling errors. 

## <a name="motivation"></a> Motivation

Some words need to be added to the browser's custom dictionary so that the browser does not mark them as spelling errors.

Some websites focus on specific topics. For instance, 
- The website dedicated to Pokémon might feature the names of various Pokémon characters, such as Pikachu and Charmander.
- The website provides information about South Korea and may include Korean words or terms presented in English pronunciation.
- The website related to analyzing economic market status would include the terminology related to the company's names and products

The words mustn't be presented as spelling errors in the cases above.

The added words need to be removed at some point if those aren't necessary.

Current specs such as [`element.spellcheck` attribute](https://html.spec.whatwg.org/multipage/interaction.html#attr-spellcheck) and [`::spelling-error` CSS pseudo-element](https://drafts.csswg.org/css-pseudo/#selectordef-spelling-error) manage the words already in the dictionary.
Therefore, the new API would be needed to manipulate the custom dictionary.

## <a name="proposal"></a> Proposal

### Syntax
```
[LegacyOverrideBuiltIns]
partial interface Document {
  // user interaction
  undefined addWord(DOMString word, DOMString language);
  boolean hasWord(DOMString word, DOMString language);
  undefined removeWord(DOMString word, DOMString language);
};
```

- `hasWord()` checks for the words in the custom dictionary. Returns `true` if a word is already in the custom dictionary.
- `addWord()` adds a word to the custom dictionary
- `removeWord()` removes a word from the custom dictionary


### Data Storage
To minimize the risk of data leakage, the data related to the custom dictionary is managed by non-persistent browser sessions.

### Example

#### Example 1. Manipulate the custom dictionary
```js

// Add a word to the dictionary
document.addWord("IRL", "en-GB");
document.addWord("TBH", "en-GB");

// Delete a word from the dictionary
document.removeWord("TBH", "en-GB");
```

#### Example 2. Add the new proper noun word
```js

// Add a word to the dictionary
document.addWord("Pikachu", navigator.language);

```

## <a name="security"></a> Security and Privacy Considerations
The custom dictionary data won't be loaded cross-origin. To implement this feature, user agents must use the potentially [CORS-enabled fetch method](https://fetch.spec.whatwg.org/#http-cors-protocol).

## <a name="future"></a> Future Work
### Persistently store data
To enrich the user experience, the data needs to be stored persistently inside the browser.
Using a scheme such as IndexedDB is under consideration.

## <a name="discuss"></a> Discussion
