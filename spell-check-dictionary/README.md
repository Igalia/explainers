# Explainer: Spell Check Custom Dictionary API

## Authors
- [Ziran Sun](mailto:zsun@igalia.com) 
- [Brian Kardell](mailto:bkardell@igalia.com)
- Jihye Hong  

---

## Introduction

Browsers provide spell checking by comparing text against built‑in dictionaries (local or server‑side). This works well for general language, but breaks down on pages that rely heavily on domain‑specific terminology—product names, proper nouns, fictional universes, technical jargon, and other vocabulary that is valid *in context* but absent from standard dictionaries. 

These valid *in context* words are marked by the spellchecker for spelling check errors. To allow users to selectively suppress this kind of spell check violations, some browsers introduce the *custom dictionary* (refers as ***browser custom dictionary*** in the context of this proposal) concept that allow users to add own customed words via the browsers’ settings panels. For example, in Chromium-based browsers users can manage their custom spellcheck dictionary using the internal settings page(chrome://settings/editDictionary) or using Context Menu.

This Spell Check Custom Dictionary API provides the functionality as the *browser custom dictionary* but fills the gap that allows pages to programmatically introduce the dictionary rather than from browsers' settings panels.

---

## User‑Facing Problems

Spell checkers routinely flag words that are correct within a site’s domain but unknown to general dictionaries. Examples include:

- A Pokémon wiki containing names like *Pikachu* or *Charmander*.  
- A financial analysis dashboard referencing company‑specific product names or tickers.  
- A medical or scientific tool using specialized terminology.  

False positives in these contexts are distracting, misleading, and erode user trust. While browsers allow *users* to add custom words via browser settings panel, there is currently no way for *pages* to provide a custom dictionary programmatically that applies only within their own context in order to reduce those false positives.

Authors need a way to treat domain‑specific words as “known” without requiring user intervention.

---

## Golals

To provide the functionality as the *browser custom dictionary* but available to the providing site, by way of a programmatic API. The spell check custom dictionary introduced by this API contains words string(s) that the page would like spell checker to **ignore** so that they will not be marked for spelling errors.

*Browser custom dictionary* only contains added word strings. These added words apply across **all** the user enabled languages. The Spell Check Custom dictionary API is in line with *browser custom dictionary* at this aspect.

The Spell Check Custom dictionary introduced by this API is **an addition** to browsers' existing spell checking dictionaries, including *browser custom dictionary*. It should NOT have impact on the roles of the existing dictionaries in spell checking in the browsers. Browsers' usage of spellchecking APIs normally depends on the operating systems used. For example, in Windows Chrome uses [Windows native spellcheck API](https://issues.chromium.org/issues/40097238) by default and falls back to open-source [Hunspell library](https://hunspell.github.io/) the browser integrates. For macOS, the browser integrates directly with the [system-level dictionaries](https://teamdev.com/jxbrowser/docs/guides/spell-checker/) provided by Apple. For iOS, Chrome uses the [system spellchecker](https://developer.apple.com/documentation/uikit/uitextchecker) associated with WebKit. In Linux, it primarily relies on the [Hunspell library](https://hunspell.github.io/) integrated. Chrome for Android does not have its own independent spellcheck engine. Instead, it relies on the Android operating system's built-in [spellchecker](https://developer.android.com/reference/android/view/textservice/TextServicesManager) or [individual Keyboard App](https://support.google.com/gboard/answer/6380730?hl=en&co=GENIE.Platform%3DAndroid). The existing spelling check mechanism in browsers work as it is apart from also checking words against the Spell Check Custom dictionary introduced by this API before marking spelling errors.

The dictionary introduced by this API could be used outside of spelling check, such as autocorrect, refining suggestion list and [proofreader](https://github.com/webmachinelearning/proofreader-api/blob/main/README.md#customization-with-user-mutable-dictionary). Extending usages could be discussed in future proposals. 

---

## Proposed Approach: SpellCheckCustomDictionary API

We propose introducing a Spell Check Custom dictionary exposed via a new interface. This dictionary is a per‑document based, transient dictionary resides in renderer process of the Browser.

### `SpellCheckCustomDictionary`

This interface provides a single observable array with *addWords()* and *removeWords()* methods:
```
[
    Exposed=Window,
    SecureContext,
    RuntimeEnabled=SpellCheckCustomDictionaryAPI
] interface SpellCheckCustomDictionary {
    attribute ObservableArray<DOMString> words;
    [CallWith=ScriptState] void addWords(sequence<DOMString> words);
    [CallWith=ScriptState] void removeWords(sequence<DOMString> words);
};
```

Example:


```js
window.spellCheckCustomDictionary.words = [
  "Igalia",
  "Wolvic",
  "SpellCheckCustomDictionary"
];

window.spellCheckDictionary.addWords(["interop", "spidermonkey"]);

window.spellCheckDictionary.removeWords(["Wolvic", "spidermonkey"]);

```

Key characteristics:

- **Observable array**  
  The browser’s spell checker observes changes to `.words` and incorporates them into its checks. Because the “.words” attribute in spell check Custom dictionary is mutable, we propose to use *ObservableArray* type as suggested [here](https://github.com/WebAudio/web-speech-api/pull/169#issuecomment-3006838443).
  
  ObservableArray offers developers a great choices of standard Array methods. This gives us the convinence of manipulating the dictionary with functionalities by calling standard Array methods. *.addwords()*, *removewords()* methods give the direct interfaces for adding/removing words from the dictionary. For example,
  
```js
const phraseData = [
  { phrase: 'Igalia' },
  { phrase: 'Wolvic' },
  { phrase: 'Orca' }
  
];

const phraseObjects = phraseData.map(p => p.phrase);

SpellCheckCustomDictionary.words = phraseObjects;

// hasWord()
SpellCheckCustomDictionary.words.includes("Igalia");

// Second array
const pokemon_family1 = ["Pikachu", "Togetic", "Pancham"];
const pokemon_family2 = ["Metapod", "Caterpie", "Squirtle"];

// addWords() with standard array method.
SpellCheckCustomDictionary.words.push(...pokemon_family1);

// Call addWords() method directly.
SpellCheckCustomDictionary.addWords(pokemon_family2);

// Call removeWords() method directly.
SpellCheckCustomDictionary.removeWords(pokemon_family1);

// removeWords() with standard array method.
SpellCheckCustomDictionary.words = SpellCheckCustomDictionary.words.filter(item => !pokemon_family1.includes(item))
```
  
- **Per‑document lifecycle**  
The dictionary is strictly local to the document it's associated with.
    
    The dictionary exists only for the lifetime of the document. Closing the tab or navigating away discards it. It stores data in memory at the renderer side. The stored data stays at the renderer and does not pass around. A detailed description of the Chromium design is available in [The Per‑Document Design in Chromium](https://docs.google.com/document/d/1ND1a1Z4i6kXMHqMwEyRkHSj5VVTWgX5Ya0aNLgVQYGw/edit?tab=t.0#heading=h.kmfizh6cwyy4).

- **Render‑process managed**  
  Unlike user‑managed dictionaries (which live in browser settings and are global), this dictionary is scoped to the page and controlled programmatically.

- **Simple, efficient design**  
  A static interface with a single observable array allows:
  - fast bulk assignment,
  - efficient parsing of serialized lists,
  - straightforward garbage collection,
  - minimal API surface.

Note that "words" is loosely defined and may include spaces or special characters.

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

- Chromium already ships the biasing feature unprefixed, and Firefox is close behind, limiting room for redesign.  
- Browsers could choose to treat Web Speech terms as valid for spell checking (or vice versa) *without* additional API surface.
- The spellcheck dictionary data must be associated with a script realm for privacy and dynamic access, whereas speech data is sent to a unified location and is not dynamically modifiable by script.

Given these constraints, a unified abstraction adds complexity without clear benefit.

### 2. Manual Synchronization Between Features

If authors *do* want to share vocabulary between APIs, this is trivial today.  Given that 
phrase objects have more robust information, it can be as simple as:

```js
SpellCheckCustomDictionary.words =
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
SpellCheckCustomDictionary.words = dictionaryWords;

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
  
- **The dictionary is local to the document it's associated with**
Details are discussed at [The Per‑Document Design in Chromium](https://docs.google.com/document/d/1ND1a1Z4i6kXMHqMwEyRkHSj5VVTWgX5Ya0aNLgVQYGw/edit?tab=t.0#heading=h.kmfizh6cwyy4)



We do not foresee accessibility or internationalization issues beyond those already inherent in spell checking.

---

## Stakeholder Feedback / Opposition

*(To be filled as feedback is collected.)*

---

## References & Acknowledgements

* Chromium design document: [The Per‑Document Design in Chromium](https://docs.google.com/document/d/1ND1a1Z4i6kXMHqMwEyRkHSj5VVTWgX5Ya0aNLgVQYGw/edit?tab=t.0#heading=h.kmfizh6cwyy4)  
* [Web Speech Contextual Biasing API](https://github.com/WebAudio/web-speech-api/blob/main/explainers/contextual-biasing.md) 
- Thanks to reviewers and collaborators across browser vendors and standards groups.
