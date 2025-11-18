# Explainer: API for handling the Document Local Dictionary

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

This explainer proposes a new API, Document Local Dictionary API, to allow pages to selectively suppress spell check violations.

## <a name="user-problem"></a> User-Facing Problem

When spell-checking is enabled, browsers check the spellings of words against those installed dictionary/dictionaries(locally or at the server side).  The misspelt words will then be marked for spelling errors.

However, there are specific cases where words are not in the dictionaries but still valid. For example,

- A website dedicated to Pokémon might feature the names of various Pokémon characters, such as Pikachu and Charmander.
- A website related to analyzing the economic market status might include the terminology related to the company's names and products that do not come from standard dictionaries but are valid in the context.

When these "valid" words are marked for spelling errors in these kinds of circumstances, it could be misleading, annoying and distractive for some users.

It would be useful that websites can have options to manipulate those "site specific" words to stop browsers' spell checkers from marking them for spelling errors.

## <a name="proposed-approach"></a> Proposed Approach

### Document Local Dictionary

We are proposing a new concept: the Document Local Dictionary. As the name says, it is a transient dictionary scoped local to a single document.

Exposed API will allow the web page to add, remove and check words, typically those not in the dictionary/dictionaries that browsers already have, in the Document Local Dictionary. During the spelling check, the spellchecker will also check words against this dictionary. This mechanism gives the pages an option to selectively suppress spell check violations on their own page.

It is noted that some browsers allow users to add/remove words via the browsers' setting panel, which is normally managed via the browser process. The Document Local Dictionary API is a different concept. The Document Local Dictionary API fills the gap that allows pages to programmatically modify the dictionary on a per-document basis and it is managed by the render process.

### API Syntax

```
User agents must create a Dictionary object whenever a document is created and associate the object with that document.

[Exposed=Window]
interface Document : Node {
  constructor();

   ...

  [SameObject] readonly attribute Dictionary dictionary;
};

[Exposed=Window]
interface Dictionary {
  undefined add(sequence<DOMString> words, DOMString language);
  undefined delete(sequence<DOMString> words, DOMString language);
  boolean has(DOMString word, DOMString language);
};
```
- `add()` adds a list of words to the *Document Local Dictionary*
- `delete()` deletes a list of words from the *Document Local Dictionary*
- `has()` returns `true` if the passed word is already present in the *Document Local Dictionary*. Otherwise `false`


### Example


```js
// Add word(s) to the dictionary
document.dictionary.add(["Igalia", "Wolvic"], "en-GB");
document.dictionary.add(["Pikachu"], navigator.language);

// Delete word(s) from the dictionary
document.dictionary.delete(["Igalia"], "en-GB");

// Check if a word is already in the dictionary
document.dictionary.has("Pikachu", "en-GB");

```

### Per-document based dictionary

The "Document Local Dictionary" is local to each document and should be per-document based in implementation. As an example, We have described the design for Chromium at [The Per-Document Design of Document Local Dictionary API](https://docs.google.com/document/d/1ND1a1Z4i6kXMHqMwEyRkHSj5VVTWgX5Ya0aNLgVQYGw/edit?tab=t.0).

## <a name="security"></a> Accessibility, Internationalization, Privacy, and Security Considerations

The *Document Local Dictionary* data is transient and will be released once a document or tab is closed in Chromium.  

We are not foreseeing any particular network violation introduced.

## <a name="stakeholder"></a> Stakeholder Feedback / Opposition
## <a name="reference"></a> References & Acknowledgements
