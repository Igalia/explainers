# Explainer: API for handling the Document Local Dictionary

- Contents:
  - [Authors](#authors)
  - [Motivation](#motivation)
  - [Proposal](#proposal) 
  - [The Per-Document Design](#per-document)
  - [Security and Privacy Considerations](#security) 

## <a name="authors"></a> Authors

* Ziran Sun  \<zsun@igalia.com\>
* Jihye Hong

# <a name="motivation"></a> Motivation

When spell-checking is enabled, browsers check the spellings of words against those installed dictionary/dictionaries(locally or at the server side).  The mispelled words will then be marked for spelling errors.

However, there are specific cases where words are not in the dictionaries but still valid. For example,

- A website dedicated to Pokémon might feature the names of various Pokémon characters, such as Pikachu and Charmander.
- A website related to analyzing the economic market status might include the terminology related to the company's names and products that do not come from standard dictionaries but are valid in the context.

When these "valid" words are marked for spelling errors in these kinds of circumstances, it could be misleading, annoying and distractive for some users.


# <a name="proposal"></a> Proposal

### Document Local Dictionary

We are proposing a new concept: the "Document Local Dictionary". As the name says, it is a transient dictionary scoped local to a single document.

Exposed API will allow the web page to add, remove and check words, typically those not in the dictionary/dictionaries that browsers already have, in the "Document Local Dictionary". During spelling check, spellchecker will also check words against this dictionary. This mechanism gives the pages an option to selectively suppress spell check violations on their own page.

It is note that some browsers allow users to add/remove words via browsers' setting panel, which is normally managed via browser process. The Document Local Dictionary" API is a different concept. The Document Local Dictionary API fills the gap that allows pages to programmatically modify the dictionary on a per-document basis and it is managed by the render process.

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

## The Per-Document Design in Chromium

The "Document Local Dictionary" is local to each document and the design needs to be per-document based. This concept fits in the spellchecker mechanism in Chromium.

In Chromium, the spell check functionality is primarily handled through an interaction between a [SpellCheckProvider](https://source.chromium.org/chromium/chromium/src/+/main:components/spellcheck/renderer/spellcheck_provider.h;l=43?q=spellcheckprovider&sq=&ss=chromium) in the renderer process and the [SpellCheckHost](https://source.chromium.org/chromium/chromium/src/+/main:components/spellcheck/common/spellcheck.mojom;drc=42cd44f4cbdfd33df896e190955b0987c431cd06;l=45) in the browser process, utilizing Mojo inter-process communication (IPC).

The [SpellCheckProvider](https://source.chromium.org/chromium/chromium/src/+/main:components/spellcheck/renderer/spellcheck_provider.h;l=43?q=spellcheckprovider&sq=&ss=chromium) is an object in the Renderer process that interacts with Blink and handles the initial spellcheck request. [SpellCheckProvider](https://source.chromium.org/chromium/chromium/src/+/main:components/spellcheck/renderer/spellcheck_provider.h;l=43?q=spellcheckprovider&sq=&ss=chromium) is a RenderFrameObserver [[1]](https://source.chromium.org/chromium/chromium/src/+/main:components/spellcheck/renderer/spellcheck_provider.h;drc=caa07f2daae0a5dd10ccfc972f1bc4b21930af7b;l=43). This means that it has a 1:1 mapping to a RenderFrame, hence a 1:1 mapping to a frame/document as the RenderFrame represents the contents of one web document in a tab or subframe.

The [SpellCheckHost](https://source.chromium.org/chromium/chromium/src/+/main:components/spellcheck/common/spellcheck.mojom;drc=42cd44f4cbdfd33df896e190955b0987c431cd06;l=45) in the Browser process is bound as an associated interface with the RenderFrameHost [[2]](https://docs.google.com/document/d/1zncMkJLH_Yx63EVN94clXDfwS0sirSd6BR6EAa9JtFo/edit?tab=t.0#heading=h.7nki9mck5t64). It primarily opens files related to dictionaries and language data to perform its spelling check function. 

Since Document Local Dictionary stores words in memory, no file operation is needed. It should be sufficient enough to keep all the functionalities within the renderer side where classes for spellchecking are owned by frames.

The basic concept for implementation is to introduce a new instance of [CustomDictionaryEngine](https://source.chromium.org/chromium/chromium/src/+/main:components/spellcheck/renderer/custom_dictionary_engine.h;l=14?q=custom_dictionary%20engine&ss=chromium). The [SpellCheckProvider](https://source.chromium.org/chromium/chromium/src/+/main:components/spellcheck/renderer/spellcheck_provider.h;l=43?q=spellcheckprovider&sq=&ss=chromium) monitors the changes on the Document Local Dictionary via the [CustomDictionaryEngine](https://source.chromium.org/chromium/chromium/src/+/main:components/spellcheck/renderer/custom_dictionary_engine.h;l=14?q=custom_dictionary%20engine&ss=chromium) instance, triggers spell checking operation against the updated Document Local dictionary and unmark the words that are included in the Document Local Dictionary.

## Security and Privacy Considerations

The *Document Local Dictionary* data is transient and will be released once a document or tab is closed in Chromium.  

We are not foreseeing any particular network violation introduced.
