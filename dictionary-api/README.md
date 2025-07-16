# Explainer: Dictionary API for handling the Document Local Dictionary

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

The proposed Dictionary APIs enable users to modify the document local dictionary in the browser. Users can add, remove, and check words in the document local dictionary.
This feature ensures the browser does not mark words in the document local dictionary as spelling errors.

The document local dictionary mentioned here differs from the browser's custom dictionary. 
The browser process manages the browser's custom dictionary, which the user can modify via the settings panel of the Chrome browser.
The renderer process manages the document local dictionary.

## <a name="motivation"></a> Motivation

Some words need to be added to the document custom dictionary so that the browser does not mark them as spelling errors.

Some websites focus on specific topics. For instance, 
- The website dedicated to Pokémon might feature the names of various Pokémon characters, such as Pikachu and Charmander.
- The website provides information about South Korea and may include Korean words or terms presented in English pronunciation.
- The website related to analyzing economic market status would include the terminology related to the company's names and products

The words mustn't be presented as spelling errors in the cases above.

The added words need to be removed at some point if they aren't necessary.

Current specs such as [`element.spellcheck` attribute](https://html.spec.whatwg.org/multipage/interaction.html#attr-spellcheck) and [`::spelling-error` CSS pseudo-element](https://drafts.csswg.org/css-pseudo/#selectordef-spelling-error) manage the words already in the dictionary.
Therefore, the new API would be needed to manipulate the document local dictionary.

## <a name="proposal"></a> Proposal

### Syntax
```
User agents must create a CustomDictionary object whenever a document is created and associate it with that document.

[Exposed=Window]
interface Document : Node {
  constructor();

   ...

  [SameObject] readonly attribute LocalDictionary localDictionary;
};

[Exposed=Window]
interface LocalDictionary {
  undefined addWord(DOMString word, DOMString language);
  boolean containsWord(DOMString word, DOMString language);
  undefined removeWord(DOMString word, DOMString language);
};
```
- `addWord()` adds a word to the document local dictionary
- `containsWord()` checks for the words in the document local dictionary. Returns `true` if a word is already in the document local dictionary.
- `removeWord()` removes a word from the document local dictionary

### High-level Architecture
![Flow diagram](dictionary_api_diagram.png)

### Data Storage
The document local dictionary data is managed in the format of `std::set<std::u16string>`, which is defined in [CustomDictionaryEngine](https://source.chromium.org/chromium/chromium/src/+/main:components/spellcheck/renderer/custom_dictionary_engine.h;l=14;bpv=1;bpt=1?q=custom_dictionary%20engine&ss=chromium).
It is defined for a RenderProcess

`document.localDictionary.addWord` or `document.localDictionary.removeWord` triggers [`CustomDictionaryEngine::OnCustomDictionaryChanged`](https://source.chromium.org/chromium/chromium/src/+/main:components/spellcheck/renderer/custom_dictionary_engine.cc;bpv=1;bpt=1) to insert or erase a word via `std::set<std::u16string>` type of the local dictionary.

### Example

#### Example 1. Manipulate the document local dictionary
```js

// Add a word to the dictionary
document.localDictionary.addWord("IRL", "en-GB");
document.localDictionary.addWord("TBH", "en-GB");

// Delete a word from the dictionary
document.localDictionary.removeWord("TBH", "en-GB");
```

#### Example 2. Add the new proper noun word
```js

// Add a word to the dictionary
document.localDictionary.addWord("Pikachu", navigator.language);

```

## <a name="security"></a> Security and Privacy Considerations
The document local dictionary data won't be loaded cross-origin. To implement this feature, user agents must use the potentially [CORS-enabled fetch method](https://fetch.spec.whatwg.org/#http-cors-protocol).
Also, the data related to the document local dictionary is managed by non-persistent browser sessions.

## <a name="future"></a> Future Work
### Persistently store data
In terms of site optimization, saving document local dictionary data persistently would allow sites to have large dictionaries without set-up costs and the bandwidth to transmit dictionaries on every load.
Also, it's helpful when Internet connections are flaky or non-existent.
Using a scheme such as IndexedDB is under consideration.

## <a name="discuss"></a> Discussion
