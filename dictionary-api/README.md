# Explainer: Dictionary API for handling the Document Custom Dictionary

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

The proposed Dictionary APIs enable users to modify the document custom dictionary in the browser. Users can add, remove, and check words in the document custom dictionary.
This feature ensures that the browser does not mark words in the document custom dictionary as spelling errors.

The document custom dictionary mentioned here is different from the browser's custom dictionary. 
The browser's custom dictionary is managed by the browser process and the user can modify it via the settings panel of the Chrome browser.
The document custom dictionary is managed by the renderer process.


## <a name="motivation"></a> Motivation

Some words need to be added to the document custom dictionary so that the browser does not mark them as spelling errors.

Some websites focus on specific topics. For instance, 
- A website dedicated to Pokémon might feature the names of various Pokémon characters, such as Pikachu and Charmander.
- A website that provides information about South Korea and may include Korean words or terms presented in English pronunciation.
- A website related to analyzing economic market status would include the terminology related to the company's names and products

Specific words shouldn't be presented as spelling errors in the cases above.

It needs to be possible to remove added words if they become unnecessary.

Current specs such as [`element.spellcheck` attribute](https://html.spec.whatwg.org/multipage/interaction.html#attr-spellcheck) and [`::spelling-error` CSS pseudo-element](https://drafts.csswg.org/css-pseudo/#selectordef-spelling-error) manage the words already in the dictionary.
Therefore, a new API is be needed to manipulate the document custom dictionary.

## <a name="proposal"></a> Proposal

### Syntax
```
User agents must create a CustomDictionary object whenever a document is created, and associate the object with that document.

[Exposed=Window]
interface Document : Node {
  constructor();

   ...

  [SameObject] readonly attribute CustomDictionary customDictionary;
};

[Exposed=Window]
interface CustomDictionary {
  undefined addWord(DOMString word, DOMString language);
  boolean containsWord(DOMString word, DOMString language);
  undefined removeWord(DOMString word, DOMString language);
};
```
- `addWord()` adds a word to the document custom dictionary
- `containsWord()` returns `true` if the passed word is already present in the document custom dictionary; otherwise `false`
- `removeWord()` removes a word from the document custom dictionary

### High-level Architecture
![Flow diagram](dictionary_api_diagram.png)

### Data Storage
The document custom dictionary data is managed in the format of `std::set<std::u16string>`, which is defined in [CustomDictionaryEngine](https://source.chromium.org/chromium/chromium/src/+/main:components/spellcheck/renderer/custom_dictionary_engine.h;l=14;bpv=1;bpt=1?q=custom_dictionary%20engine&ss=chromium).
It is defined for a RenderProcess.

`document.customDictionary.addWord` or `document.customDictionary.removeWord` triggers [`CustomDictionaryEngine::OnCustomDictionaryChanged`](https://source.chromium.org/chromium/chromium/src/+/main:components/spellcheck/renderer/custom_dictionary_engine.cc;bpv=1;bpt=1) to insert or erase a word via `std::set<std::u16string>` type of custom dictionary.

### Example

#### Example 1. Manipulating the custom dictionary
```js

// Add a word to the dictionary
document.customDictionary.addWord("IRL", "en-GB");
document.customDictionary.addWord("TBH", "en-GB");

// Delete a word from the dictionary
document.customDictionary.removeWord("TBH", "en-GB");
```

#### Example 2. Adding a new proper noun
```js

// Add a word to the dictionary
document.customDictionary.addWord("Pikachu", navigator.language);

```

## <a name="security"></a> Security and Privacy Considerations
The document custom dictionary data won't be loaded cross-origin. To implement this feature, user agents must use the potentially [CORS-enabled fetch method](https://fetch.spec.whatwg.org/#http-cors-protocol).
Also, data related to the document custom dictionary is to be managed by non-persistent browser sessions.

## <a name="future"></a> Future Work
### Persistently store data
In terms of site optimization, persistently saving document custom dictionary data would allow sites to have large dictionaries without set-up costs and the bandwidth to transmit dictionaries on every load.
Also, it's helpful when Internet connections are flaky or non-existent.
Using a scheme such as IndexedDB is under consideration.

## <a name="discuss"></a> Discussion
