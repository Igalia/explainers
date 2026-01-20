# Explainer: Spell Check Custom Dictionary API

## Authors

* Ziran Sun  \<zsun@igalia.com\>
* Jihye Hong

## Table of Contents
  - [Introduction](#introduction)
  - [User-Facing Problem](#user-problem)
  - [Proposed Approach](#proposed-approach) 
  - [Accessibility, Internationalization, Privacy, and Security Considerations](#security)
  - [Stakeholder Feedback / Opposition](#stakeholder)
  - [References & acknowledgements](#reference)

## <a name="introduction"></a> Introduction

This explainer proposes a new API, Spell Check Custom Dictionary API, to allow pages to selectively suppress spell check violations, offer better spelling correction suggestions, and potentially enable user agents to explore additional future niceties.

## <a name="user-problem"></a> User-Facing Problems

Browsers offer various things related to spell-checking, correction and completion.  Browsers accomplish this via comparison with words in installed dictionary/dictionaries(locally or at the server side). The misspelt words will then be marked for spelling errors, and/or offered as potential corrections, suggestions or completions.

However, there are specific cases where words are not in those existing dictionaries but still valid in the context of the page. For example,

- A website dedicated to Pokémon might feature the names of various Pokémon characters, such as Pikachu and Charmander.
- A website related to analyzing the economic market status might include the terminology related to companies' names and products that do not come from standard dictionaries but are valid in the context.

When the "valid" words are marked for spelling errors in these kinds of circumstances, it could be misleading, frustrating and distracting.

It would be useful for websites to have options to treat those "site specific" words as if they were in the known dictionaries.


## <a name="proposed-approach"></a> Proposed Approach

### Spell Check Custom Dictionary API

We are introducing a new interface: the SpellCheckCustomDictionary API. As the name sugguests, it is a dictionary created and customized by websites/developers for spell checking related tasks. The proposed API will allow the web page to add, remove words, typically those not in the dictionary/dictionaries that browsers already have, in the custom dictionary. During the spelling check, the spellchecker will also check words against this custom dictionary. This mechanism gives the pages an option to selectively suppress spell check violations on their own page.

It is noted that some browsers allow users to add/remove words via the browsers’ setting panel, which is normally managed via the browser process. The SpellCheckCustomDictionary API is a different concept. The SpellCheckCustomDictionary API fills the gap that allows pages to programmatically modify the dictionary on a per-document basis and it is managed by the render process.

### Design Considerations on Interop

Handling domain specific terminology/phrases/words probably is not the use case only for spell checker. For example, Web Speech has introduced [Contextural biasing API](https://github.com/WebAudio/web-speech-api/blob/main/explainers/contextual-biasing.md) to handle domain-specific terminology, proper nouns, or other words that are unlikely to appear in general conversation. There might be other usages or requirements for custom dictionaries in other places or in the future.

Words/phrases in a custom dictionary for one component (e.g. spellchecker) in a specific domain could apply for another component (e.g. web speech). For words/phrases that are duplicate among the dictionaries of these components, it would make sense for developers to only update the word list once rather than looping through all the dictionaries in the components. For this reason, we are introducing generic interfaces for phrase and dictionary. A component has the option to bind to the dictionary for word/phrase updates. 

### New API Components

#### `CustomPhrase` Interface

Represents a single phrase and an optional dictionary that contains the extra parameters associated with the phrase. The optional Dictionary data type attribute is introduced here to accommodate use cases that may require further specific parameters. For example, an extra parameter `boost` for web speech. 

```json=
new Customphrase('Igalia', {boost: 2.0})
```

#### CustomDictionary Interface

##### CustomDictionary.words

A`CustomPhrase` array. Since the words/phrases in the dictionary are mutable, we are adopting the concept of ObservableArray. This observable array can be modified like a JavaScript Array.

```json=
const customDict = new CustomDictionary();
const phraseData = [
  { phrase: 'Igalia' },
  { phrase: 'Wolvic' }
];

const phraseObjects = phraseData.map(p => new CustomPhrase(p.phrase));
customDict.words = phraseObjects;

customDict.words.push(new Customphrase('Orca'));
customDict.words.pop();
```

#### Component binding

An interface between a component and a `CustomDictionary`.

```json=
cost customDict = new CustomDictionary();

const spellChecker = new SpellCheckBinding();
spellChecker.bind(customDict);

const recognition = new SpeechRecognition();
recognition.bind(customDict);


customDict.words.push(Customphrase('Interop', {boost: 2.0}));

```

### Per-document based dictionary

The spell check custom dictionary is a transient dictionary and lives no longer than the life cycle of the associated document. It is a per-document based in implementation. As an example, we have described the design for Chromium at [The Per-Document Design in Chromium](https://docs.google.com/document/d/1ND1a1Z4i6kXMHqMwEyRkHSj5VVTWgX5Ya0aNLgVQYGw/edit?tab=t.0#heading=h.5z9kcz3slooe).

## <a name="security"></a> Accessibility, Internationalization, Privacy, and Security Considerations

The *Spell Check Custom Dictionary* data is transient and will be released once a document or tab is closed in Chromium.  

Browsers already use designs that prevent observation or detection of words in the local dictionaries through style or DOM observations.

We do not foresee any particular network violation introduceds.


## <a name="stakeholder"></a> Stakeholder Feedback / Opposition
## <a name="reference"></a> References & Acknowledgements   


