# Explainer: Spell Check Custom Dictionary API

## Authors
- [Ziran Sun](mailto:zsun@igalia.com)
- [Brian Kardell](mailto:bkardell@igalia.com)
- Jihye Hong

---

## Introduction

Browsers provide spell checking by comparing text against built‑in dictionaries (local or server‑side). This works well for general language, but breaks down on pages that rely heavily on domain‑specific terminology—product names, proper nouns, fictional universes, technical jargon, and other vocabulary that is valid *in context* but absent from standard dictionaries.

Some browsers let users address this by maintaining a personal custom dictionary through browser settings. But there is currently no way for a page to supply its own domain-specific vocabulary programmatically — meaning authors have no way to prevent their users from seeing distracting false positives for the spell checking of words that are perfectly valid in context.

This proposal introduces a SpellCheckCustomDictionary API that lets pages provide exactly that: a per-document, programmatically managed dictionary that works alongside existing browser and user provided dictionaries to suppress false positives for domain-specific terms.

---

## User‑Facing Problems

Spell checkers routinely flag words that are correct within a site’s domain but unknown to general dictionaries. Examples include:

- A Pokémon wiki containing names like *Pikachu* or *Charmander*.
- A financial analysis dashboard referencing company‑specific product names or tickers.
- A medical or scientific tool using specialized terminology.

False positives in these contexts are distracting, frustrating, misleading, and might even cause users to lose trust. While browsers allow users to add words via their personal custom dictionary in browser settings, this requires manual intervention for every user on every site, and is not a realistic solution for domain-specific vocabulary that the page author already knows is valid.

---

## Goals

* Allow pages to suppress false spell-check positives for domain-specific vocabulary without requiring actions from users.

* Leave all existing spell-check behavior — including browser, OS, and user dictionaries — completely unchanged. This API adds a layer; it does not replace or interfere with anything.

## Non-Goals

* This API does not aim to cover spell-check suggestions, autocorrect, or AI proofreading features — though it could potentially inform those in other proposals, and/or can integrate nicely with other features.

* Exceed the language-targeting capabilities of the existing browser custom dictionary. Words added via this API apply across all user-enabled languages, exactly as they do today for user-added words — no more, no less.

## Proposed Approach

We propose the addition of a new `SpellCheckCustomDictionary` object accessible via `document.spellCheckCustomDictionary`, where users can manage sets of "words" via calls to its method `addWords()` or `removeWords()`.


```
[
    Exposed=Window,
    SecureContext
] interface SpellCheckCustomDictionary {
    undefined addWords(sequence<DOMString> words);
    undefined removeWords(sequence<DOMString> words);
};

partial interface Document {
    [SameObject] readonly attribute SpellCheckCustomDictionary spellCheckCustomDictionary;
};
```

Example:

```js

document.spellCheckCustomDictionary.addWords(["Igalia", "Wolvic", "spidermonkey"]);

document.spellCheckCustomDictionary.removeWords(["Wolvic", "spidermonkey"]);

```
**Note:** On platforms whose native spellcheck APIs distinguish *ignored* from *learned* words (e.g. *NSSpellChecker.ignoreWord:inSpellDocumentWithTag* in macOS/iOS, *mIgnoreTable* in Firefox), *learned* words are added permanently to the user's persistent dictionary, whereas *ignored* words are held only in a transient, in-memory list. This web API maps to the **ignored** semantics. Moreover, it exposes an explicit ```removeWords()``` and is *more tightly scoped* to the ```Document```.

**Note:** Both ```addWords()``` and ```removeWords()``` are essential for this interface. We need ```removeWords()``` to retract mistakes, mirror user unmarks, and prevent the dictionary from growing unboundedly. For single page applications particularly, as the document is the whole session, when view switches, without ```removeWords()```, every view's vocabulary leaks into subsequent view. Unlike native ignore lists, which are effectively add-only, a page-driven, long-lived document does not get the automatic reset that native ignore lists have, so it needs an explicit removal primitive to scope vocabulary to the current view and bound growth.

**Note:** The custom dictionary is strictly **additive** and should not modify any underlying dictionary, such as OS dictionary in macOS.

**Note:** "words" is defined loosely — validation of the entries matches how the *browser custom dictionary* works.

The new dictionary has two key characteristics:

* *Per-document lifecycle*. The dictionary exists only for the lifetime of the document. Closing the tab or navigating away discards it entirely.

* Render-process managed. Unlike the browser custom dictionary, which lives in browser settings and is global across all pages, this dictionary is scoped to the document and controlled entirely by page script.

Browsers implement spell checking differently across operating systems.  This API is designed to layer cleanly on top of all of them.

<details>
	<summary>implementation notes</summary>

The Spell Check Custom dictionary introduced by this API does NOT have impact on the roles of the existing dictionaries in spell checking in the browsers. Browsers' usage of spell checking APIs normally depends on the operating systems used. For example, in Windows, Chrome uses [Windows native spellcheck API](https://issues.chromium.org/issues/40097238) by default and falls back to open-source [Hunspell library](https://hunspell.github.io/) the browser integrates. For macOS, the browser integrates directly with the [system-level dictionaries](https://teamdev.com/jxbrowser/docs/guides/spell-checker/) provided by Apple. For iOS, Chrome uses the [system spellchecker](https://developer.apple.com/documentation/uikit/uitextchecker) associated with WebKit. In Linux, it primarily relies on the [Hunspell library](https://hunspell.github.io/) integrated. Chrome for Android does not have its own independent spellcheck engine. Instead, it relies on the Android operating system's built-in [spellchecker](https://developer.android.com/reference/android/view/textservice/TextServicesManager) or [individual Keyboard App](https://support.google.com/gboard/answer/6380730?hl=en&co=GENIE.Platform%3DAndroid). The existing spelling check mechanism in browsers continues to work as it is apart from also checking words against the Spell Check Custom dictionary introduced by this API before marking spelling errors.
</details>

## Alternatives Considered

### 1. An `ObservableArray` Type for the Dictionary
<details>

The Spell Check Custom dictionary is a collection of word strings. One option is to introduce an array attribute to represent the dictionary. Since the dictionary is mutable, an `ObservableArray` type as suggested [here](https://github.com/WebAudio/web-speech-api/pull/169#issuecomment-3006838443) could be ideal.

`ObservableArray` offers developers a great choices of standard Array methods. This gives us the convenience of manipulating the dictionary with functionalities by calling standard Array methods. However, we decided not to take this route due to the following reasons -

*  Avoid adding new fake arrays to the web platform
*  "All of the spell check-related things are carefully designed to not be observable, it might be good to not have additional methods to see inside", as suggested by the [TAG review comments](https://github.com/w3ctag/design-reviews/issues/1191)
* The content of the dictionary should not be accessible due to security and privacy risks.
</details>

### 2. A SetLike interface
<details>
For the interface, a natural alternative would be [SetLike<DOMString>], a Set-shaped surface (`add`, `delete`, `has`, `size`, `clear`, iteration) — familiar to authors who know JavaScript's `Set`. However, we chose not to use it because:

* Privacy. Exposing the read operations of the interface lets any script with access to the dictionary enumerate or probe its contents.
* Batch shape matches caller intent and scales. SetLike's ```add(value)``` is single-element. In most common use cases, callers push lists, so on a SetLike surface they end up coalescing via forEach. Bespoke ```addWords(sequence<DOMString>)``` matches caller intent, batches cleanly, and remains a single operation.
* The cost of a bespoke surface is a small ergonomic one — authors learn ```addWords / removeWords``` instead of ```add / delete```.

</details>

### 3. A Unified `CustomDictionary` Across Features
<details>

Domain-specific vocabulary isn't unique to spell checking — the [Web Speech Contextual Biasing API](https://github.com/WebAudio/web-speech-api/blob/main/explainers/contextual-biasing.md) addresses somewhat similar needs for transcription, and text-to-speech may eventually need pronunciation hints for the same terms. The proposed [Proofreader API](https://github.com/webmachinelearning/proofreader-api?tab=readme-ov-file#interaction-with-other-browser-integrated-proofreading-features) also has a need for some kind of related features, as would, for example [translation APIs](https://github.com/webmachinelearning/translation-api/issues/9).

Abstractly, a shared `CustomDictionary` abstraction could in principle serve all of these.

However, we decided against this for the following reasons:

* Chromium already ships the Web Speech biasing feature unprefixed, and Firefox is close behind, leaving little room for redesign.

* Browsers can already choose to treat Web Speech terms as valid for spell checking (or vice versa) without any additional API surface, or via later convenience methods.  That is, if it is clear this is always desired - but it is not.

Authors who want to share vocabulary between both APIs today can do so simply:

```javascript
document.spellCheckCustomDictionary.addWords(recognition.phrases.map(p => p.phrase));
```

If this pattern is still taxing or inefficient, we can always consider adding a convenience method later.

For now, keeping the API minimal helps avoid premature abstraction.
</details>

### 4. Declarative `<link>`
<details>
A natural question seems to be whether we could just make this declarative.  Perhaps something like:

```
<link rel="custom-dictionary" href="lotr.words">
```

This would have several advantages in that it is very easy for most use cases for an author to use, and would automatically plug into the browsers many useful link related semantics. It could have ready answers to questions about preloading, blocking, CORS, priority and so on. It would come with its own optimizations, in a way, because if your browser didn't support that feature, it wouldn't even download.

Given such a tag, we technically wouldn't even need an additional API surface as adding a link would add words to the dictionary and removing the link would remove them.

On balance though, there are advantages to a JavaScript based interface and we believe it's worth doing that first for two reasons:

  * As shown above, it makes it easier and more efficient to share terms among APIs with similar needs
  * We currently lack a `rel` type or agreed serialization format, which also generally happen in a different space of browser architecture. `fetch` and `json` are pretty easy ways to achieve mostly similar results and require nothing new.
  * Some use cases involve runtime-fetched vocabularies — e.g., a financial-news application receiving symbol lists from a server, where words arrive in a JavaScript execution context and ```addWords(response)``` is the direct path. A declarative form would either require server-side rendering of the word list (not always feasible when content is per-user or per-session) or amount to writing JavaScript that creates DOM nodes to declare words — strictly more roundabout than the imperative call.

Given this, while we believe it is a potentially worthwhile pursuit in future iterations, it makes the most sense to begin with the imperative API.
</details>

### 5. DOM subtree scoped

<details>
Choosing scope for the API largely depends on use cases. For example, Document-scoped is enough for whole-page vocabularies while subtree-scoped wins when multiple forms on one page need distinct vocabularies, or when web components want isolation. We would say that Document scope and DOM-subtree scope are not mutually exclusive — document scope is just the simplest form, which we can continue to build more specifically on in the future if so desired.

We propose to proceed with document-scoped first as it's a more conservative, easier-to-spec choice but leaves the door open for adding a partial interface HTMLElement later if multi-vocabulary scenarios emerge.
</details>

---

## Accessibility, Internationalization, Privacy & Security

### Accessibility
This API has no direct effect on the accessibility tree or assistive technology. Reducing false spell-check positives may modestly benefit users who rely on screen readers, by reducing noise from incorrectly flagged words being announced as errors.

### Internationalization
Words added via this API apply across all user-enabled languages, matching the behavior of the existing browser custom dictionary. Sites can simply load different dictionaries as appropriate if desired. No language-targeting beyond what already exists is introduced.

### Privacy

- **Transient data.** The custom dictionary is discarded when the document or tab closes.

- **No dictionary probing.** This API exposes no read method to script and a page can only observe words it supplied itself. A known issue with a highlight side channel — which lets a page probe dictionary membership by timing `::spelling-error` / `::grammar-error` highlight rendering — is being addressed in [css-pseudo `#highlight-security`](https://drafts.csswg.org/css-pseudo/#highlight-security) and the [user-dictionary-leaks proposal](https://github.com/explainers-by-googlers/user-dictionary-leaks). The same highlight side channel could, in principle, be used to *guess the contents of the custom set itself*, so addressing it would benefit this API too.

- **The dictionary is local to the document it's associated with.** Details are discussed at [The Per‑Document Design in Chromium](https://docs.google.com/document/d/1ND1a1Z4i6kXMHqMwEyRkHSj5VVTWgX5Ya0aNLgVQYGw/edit?tab=t.0#heading=h.kmfizh6cwyy4)


### Security

- **No new network exposure.** The API does not require network access and does not introduce new privacy risks.

- **No new attack surface.** Words are supplied by the page itself; there is no mechanism for external input or cross-origin influence.

- **Third-party iframes.** Because the dictionary is scoped per document, every iframe — including cross-origin, third-party frames — gets its own independent dictionary. An embedded third party can only add or remove words for *its own* document. Detailed discussion for Chromium case can be found at [The Per‑Document Design in Chromium](https://docs.google.com/document/d/1ND1a1Z4i6kXMHqMwEyRkHSj5VVTWgX5Ya0aNLgVQYGw/edit?tab=t.0#heading=h.kmfizh6cwyy4).

- **Resource Limits and Abuse Mitigation**

It is noted that rapid `addWords()` / `removeWords()` churns can cause waste of resources. To prevent a page from flooding or abusing the dictionary, it is recommended to introduce:
  - Implementation-defined limits — a user agent may cap the number of words and the length of each word.
  - Well-defined behavior at the limit — surplus words are ignored rather than corrupting existing state or breaking the page.

## Relationship to Other Tools & APIs

### Built-in AI APIs (Proofreader)

The [Proofreader API](https://github.com/webmachinelearning/proofreader-api) explainer references this API as a potential model for handling proper names and acronyms, while stating it is "moving forward without integration with custom dictionaries until further exploration and evaluation are done." We take the same position from this side — the features are complementary but should ship independently first — for a few reasons:
- **Different operations.** This API suppresses a spell-check flag by matching a flat string set layered over the platform spellchecker. A proofreader is generative and contextual; "accept this word" there is a fuzzier operation than "don't flag this token," and is not simply a set-membership test.
- **The surfaces are still early**. Questions are better resolved once both APIs are more settled.

### Browser Extensions (Grammarly)
Writing-assistant extensions such as Grammarly and LanguageTool run their own checking engine, independently of the browser's built-in spellchecker. Because this API layers onto the *built-in* spellchecker, it should not have automatic effect on these extensions: an extension neither consults nor is bound by the page's custom dictionary, and keeps using its own per-user vocabulary.

## Stakeholder Feedback / Opposition

| Stakeholder | Signal |
|-------------|--------|
| Chrome | Positive — implementation in progress |
| Safari | https://github.com/WebKit/standards-positions/issues/646 |
| Firefox | https://github.com/mozilla/standards-positions/issues/1384 |
| TAG | [Satisfied with Concerns](https://github.com/w3ctag/design-reviews/issues/1191) |

---

## References & Acknowledgements

* Chromium design document: [The Per‑Document Design in Chromium](https://docs.google.com/document/d/1ND1a1Z4i6kXMHqMwEyRkHSj5VVTWgX5Ya0aNLgVQYGw/edit?tab=t.0#heading=h.kmfizh6cwyy4)
* [Web Speech Contextual Biasing API](https://github.com/WebAudio/web-speech-api/blob/main/explainers/contextual-biasing.md)
* [Hunspell library](https://hunspell.github.io/)
* [Cocoa Spell Checking API](https://developer.apple.com/documentation/appkit/nsspellchecker)
* [Windows native spellcheck API](https://issues.chromium.org/issues/40097238)
* [MacOS system-level dictionaries](https://teamdev.com/jxbrowser/docs/guides/spell-checker/)
* [Android's system-level spellchecker](https://developer.android.com/reference/android/view/textservice/TextServicesManager)
* [individual Keyboard App](https://support.google.com/gboard/answer/6380730?hl=en&co=GENIE.Platform%3DAndroid)
* [translation APIs proposal](https://github.com/webmachinelearning/translation-api/issues/9)
* [Proofreader API](https://github.com/webmachinelearning/proofreader-api?tab=readme-ov-file#interaction-with-other-browser-integrated-proofreading-features)
* [Grammarly privacy and security](https://support.grammarly.com/hc/en-us/articles/20916119474829-Privacy-and-security-FAQs)
* [LanguageTool](https://languagetool.org/dev)
* [Preventing User Dictionary Leaks via `::spelling-error` and `::grammar-error` (user-dictionary-leaks explainer)](https://explainers-by-googlers.github.io/user-dictionary-leaks/)
* [WebKit standards-position #546 — User dictionary leaks via spelling/grammar pseudo-elements](https://github.com/WebKit/standards-positions/issues/546)
* [CSS Pseudo-Elements — Highlight Security](https://drafts.csswg.org/css-pseudo/#highlight-security)
- Many thanks for valuable feedback and advice from reviews and collaborators across standards groups.

