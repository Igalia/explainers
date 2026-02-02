# Explainer: Spell Check Dictionary API

## Authors
- [Ziran Sun](mailto:zsun@igalia.com) 
- [Brian Kardell](mailto:bkardell@igalia.com)
- Jihye Hong  

---

## Introduction

Browsers already provide spell checking, correction, and completion by comparing text against built‑in dictionaries (local or server‑side). This works well for general language, but breaks down on pages that rely heavily on domain‑specific terminology—product names, proper nouns, fictional universes, technical jargon, and other vocabulary that is valid *in context* but absent from standard dictionaries.

This explainer proposes a lightweight mechanism for pages to supply such context‑specific terminology to the user agent. By giving the browser a list of known‑valid words, authors can reduce false positives, improve suggestion quality, and open the door to future enhancements that rely on domain‑aware text processing.

---

## User‑Facing Problems

Spell checkers routinely flag words that are correct within a site’s domain but unknown to general dictionaries. Examples include:

- A Pokémon wiki containing names like *Pikachu* or *Charmander*.  
- A financial analysis dashboard referencing company‑specific product names or tickers.  
- A medical or scientific tool using specialized terminology.  

False positives in these contexts are distracting, misleading, and erode user trust. While browsers allow *users* to add custom words globally, there is currently no way for *pages* to provide a per‑document dictionary that applies only within their own context in order to reduce those false positives.

Authors need a way to treat domain‑specific words as “known” without requiring user intervention.

---

## Proposed Approach: SpellCheckDictionary API

We propose introducing a per‑document, transient dictionary exposed via a new interface:

### `SpellCheckDictionary`

This interface provides a single observable array:

```js
SpellCheckDictionary.words = [
  "Igalia",
  "Wolvic",
  "SpellCheckDictionary"
];
```

Key characteristics:

- **Observable array**  
  The browser’s spell checker observes changes to `.words` and incorporates them into its checks.

- **Per‑document lifecycle**  
  The dictionary exists only for the lifetime of the document. Closing the tab or navigating away discards it.

- **Render‑process managed**  
  Unlike user‑managed dictionaries (which live in browser settings and are global), this dictionary is scoped to the page and controlled programmatically.

- **Simple, efficient design**  
  A static interface with a single observable array allows:
  - fast bulk assignment,
  - efficient parsing of serialized lists,
  - straightforward garbage collection,
  - minimal API surface.

Note that "words" is loosely defined and may include spaces or special characters.

A detailed description of the Chromium design is available in [The Per‑Document Design in Chromium](https://docs.google.com/document/d/1ND1a1Z4i6kXMHqMwEyRkHSj5VVTWgX5Ya0aNLgVQYGw/edit?tab=t.0#heading=h.kmfizh6cwyy4).

---

## Alternatives Considered

### 1. A Unified `CustomDictionary` Across Features

Domain‑specific vocabulary is not unique to spell checking. Web Speech, for example, includes a [Contextual biasing API](https://github.com/WebAudio/web-speech-api/blob/main/explainers/contextual-biasing.md) for transcription of rare or domain‑specific terms. Text‑to‑Speech may eventually need similar mechanisms for pronunciation.

We explored whether a unified `CustomDictionary` or shared class hierarchy could serve multiple features. For example -

```js
// Extra parameters for different features.
dictionary CustomPhraseOptions {
  float boost = 1.0; // boost value for Speech recognition.
};

interface CustomPhrase {
    [RaisesException] constructor(DOMString phrase, optional CustomPhraseOptions options = {});
    readonly attribute DOMString phrase;
};

interface CustomDictionary {
    [CallWith=ScriptState] constructor();
    attribute ObservableArray<CustomPhrase> words;
};
```


Modules bind with the unified `CustomDictionary` to use like the follows -

```const customDict = new CustomDictionary();

spellChecker.bind(customDict);

const recognition = new SpeechRecognition();
recognition.bind(customDict);

customDict.words.push(Customphrase('Interop', {boost: 2.0}));
```

However:

- The shared abstraction becomes little more than a marker interface.  
- Chromium already ships the biasing feature unprefixed, and Firefox is close behind, limiting room for redesign.  
- Browsers could choose to treat Web Speech terms as valid for spell checking (or vice versa) *without* additional API surface.
- The spellcheck dictionary data must be associated with a script realm for privacy and dynamic access, whereas speech data is sent to a unified location and is not dynamically modifiable by script.

Given these constraints, a unified abstraction adds complexity without clear benefit.

### 2. Manual Synchronization Between Features

If authors *do* want to share vocabulary between APIs, this is trivial today.  Given that 
phrase objects have more robust information, it can be as simple as:

```js
SpellCheckDictionary.words =
  recognition.phrases.map(it => it.phrase);
```

While this isn't especially efficient, if it matters it's not _much_ harder to share the loop that creates each observable array...

```js
// Populate both dictionaries in one pass
phraseObjects = [];
dictionaryWords = [];

wordData.forEach(item => {
  // add words and phrases
});

// Apply on assignment
SpellCheckDictionary.words = dictionaryWords;

const recognition = new SpeechRecognition();
recognition.phrases = phraseObjects;
```


If this pattern is still taxing or inefficient, we can always consider adding a convenience method later.

For now, keeping the API minimal avoids premature abstraction.

---

## Accessibility, Internationalization, Privacy & Security

- **Transient data**  
  The custom dictionary is discarded when the document or tab closes.

- **No dictionary probing**  
  Browsers already prevent pages from detecting the contents of built‑in dictionaries via style or DOM observation. This API does not introduce new probing vectors.

- **No new network exposure**  
  The API does not require network access and does not introduce new privacy risks.

We do not foresee accessibility or internationalization issues beyond those already inherent in spell checking.

---

## Stakeholder Feedback / Opposition

*(To be filled as feedback is collected.)*

---

## References & Acknowledgements

- Chromium design document: [The Per‑Document Design in Chromium](https://docs.google.com/document/d/1ND1a1Z4i6kXMHqMwEyRkHSj5VVTWgX5Ya0aNLgVQYGw/edit?tab=t.0#heading=h.kmfizh6cwyy4)  
- Web Speech Contextual Biasing API  
- Thanks to reviewers and collaborators across browser vendors and standards groups.
