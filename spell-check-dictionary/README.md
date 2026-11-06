# Explainer: Spell Check Custom Dictionary API

## Authors
- [Ziran Sun](mailto:zsun@igalia.com)
- [Brian Kardell](mailto:bkardell@igalia.com)
- Jihye Hong

---

## Table of Contents

- [Introduction](#introduction)
- [User‑Facing Problems](#userfacing-problems)
- [Goals](#goals)
- [Non-Goals](#non-goals)
- [Proposed Approach](#proposed-approach)
  - [Matching](#matching)
- [Alternatives Considered](#alternatives-considered)
  - [1. An `ObservableArray` Type for the Dictionary](#1-an-observablearray-type-for-the-dictionary)
  - [2. A SetLike interface](#2-a-setlike-interface)
  - [3. A Unified `CustomDictionary` Across Features](#3-a-unified-customdictionary-across-features)
  - [4. Declarative `<link>`](#4-declarative-link)
  - [5. DOM subtree scoped](#5-dom-subtree-scoped)
  - [6. Case-insensitive matching](#6-case-insensitive-matching)
  - [7. Compatibility normalization (NFKC)](#7-compatibility-normalization-nfkc)
- [Accessibility, Internationalization, Privacy & Security](#accessibility-internationalization-privacy--security)
- [Relationship to Other Tools & APIs](#relationship-to-other-tools--apis)
- [Stakeholder Feedback / Opposition](#stakeholder-feedback--opposition)
- [Future Work](#future-work)
- [References & Acknowledgements](#references--acknowledgements)

---

## Introduction

Browsers provide spell checking by comparing text against built‑in dictionaries (local or server‑side). This works well for general language, but breaks down on pages that rely heavily on domain‑specific terminology—product names, proper nouns, fictional universes, technical jargon, and other vocabulary that is valid *in context* but absent from standard dictionaries.

Some browsers let users address this by maintaining a personal custom dictionary through browser settings, but there is currently no way for a page to supply its own domain-specific vocabulary programmatically — meaning authors have no way to prevent their users from seeing distracting false positives for the spell checking of words that are perfectly valid in context.

This proposal introduces a SpellCheckCustomDictionary API that lets pages provide  a per-document, programmatically managed dictionary that works alongside existing browser and user provided dictionaries to suppress false positives for domain-specific terms.

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
* Provide a solution which, while not specifically about autocomplete, autocorrect or spelling suggestions, also can potentially inform and or integrate with other proposals. That is, to offer something that is not in conflict with those as possible future goals.

## Non-Goals

* This API does not itself aim to address spell-check suggestions, autocorrect, or AI proofreading features.
* Exceeding the language-targeting capabilities of the existing browser custom dictionary. Words added via this API apply across all user-enabled languages, exactly as they do today for user-added words — no more, no less.

## Proposed Approach

We propose the addition of a new `SpellCheckCustomDictionary` object accessible via `document.spellCheckCustomDictionary`, where users can manage sets of "words" via calls to its methods `addWords()` and `removeWords()`.


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
**Note:** On platforms whose native spellcheck APIs distinguish *ignored* from *learned* words (e.g. *NSSpellChecker.ignoreWord:inSpellDocumentWithTag:* on macOS, *UITextChecker.ignoredWords* on iOS, and *mIgnoreTable* in Firefox), *learned* words are added permanently to the user's persistent dictionary, whereas *ignored* words are held only in a transient, in-memory list. This web API maps only to the **ignored** semantics: words are transient and per-document. How they are matched is defined by this API (see [Matching](#matching)), not by the platform's ignore list. Moreover, it exposes an explicit ```removeWords()``` and is *more tightly scoped* to the ```Document```.

**Note:** Both ```addWords()``` and ```removeWords()``` are essential for this interface. We need ```removeWords()``` to retract mistakes, mirror user unmarks, and prevent the dictionary from growing unboundedly. For single page applications particularly, as the document is the whole session, when view switches, without ```removeWords()```, every view's vocabulary leaks into subsequent views. Native ignore lists are effectively add-only. A page-driven, long-lived document does not get the automatic reset that native ignore lists have, so it needs an explicit removal primitive to scope vocabulary to the current view and to bound growth.

**Note:** The custom dictionary is strictly **additive** and should not modify any underlying dictionary, such as OS dictionary in macOS.

**Note:** "words" is defined loosely. Validation of the entries matches how the *browser custom dictionary* works.

The new dictionary has two key characteristics:

* *Per-document lifecycle*. The dictionary exists only for the lifetime of the document. Closing the tab or navigating away discards it entirely.
* *Render-process managed*. Unlike the browser's custom dictionary, which lives in browser settings and is global across all pages, this dictionary is scoped to the document and controlled entirely by page script.

Browsers implement spell checking differently across operating systems.  This API is designed to layer cleanly on top of all of them.

### Matching

A flagged word is suppressed when it *matches* a word in the document's custom dictionary. Matching is exact, with two adjustments that make the custom words behave like words in a built-in dictionary: it ignores differences in how the same characters are encoded (Unicode normalization), and it lets a word be capitalized.

#### Unicode normalization

The same visible word can be encoded in more than one way. For example, "Pikachú" can end with the single code point U+00FA, or with "u" followed by the combining accent U+0301. Which one ends up in the text depends on the keyboard, the input method, or where the text was pasted from, and the user cannot see the difference.

Words are therefore compared after [Normalization Form C (NFC)](https://unicode.org/reports/tr15/#Norm_Forms). Canonically equivalent words are the same word everywhere in the API: in matching, in `removeWords()`, and when applying any per-word length limit.

Only canonical equivalence is applied, not compatibility equivalence (NFKC). Compatibility variants such as the ligature "ﬁ" or full-width "Ｗｏｌｖｉｃ" can look different and are often deliberate, so they remain distinct words (see [Alternatives Considered §7](#7-compatibility-normalization-nfkc)).

#### Case mapping

A word in the dictionary also matches forms of itself with *more* capitals, but never forms with fewer: **capitals can be added to a word, but never removed**.

| Word added | Also matches | Still flagged |
|---|---|---|
| `pikachu` (lower case) | `Pikachu`, `PIKACHU` | `pIkachu` |
| `Pikachu` (initial capital) | `PIKACHU` | `pikachu` |
| `iPhone` (mixed case) | `IPHONE` | `iphone`, `Iphone` |
| `NASA` (all capitals) | | `Nasa`, `nasa` |
| `straße` | `Straße`, `STRASSE` | `strasse`, `Strasse` |

```js
document.spellCheckCustomDictionary.addWords(["wolvic"]);
// "wolvic", "Wolvic" and "WOLVIC" are all accepted.

document.spellCheckCustomDictionary.addWords(["Igalia"]);
// "Igalia" and "IGALIA" are accepted; "igalia" is still flagged.
```

A word can always be capitalized at the start of a sentence or set in capitals in a heading, but the capitals in a proper noun, brand name or acronym ("Paris", "iPhone", "NASA") are part of its spelling. Pages mostly add exactly this kind of word, so the API should not accept their misspellings.

Precisely, a flagged word is compared with the dictionary in NFC according to its shape:

| Flagged word | Matches when |
|---|---|
| **All capitals**: it has at least one cased character, and every cased character is upper case (`PIKACHU`) | the NFC of the upper-case mapping of some dictionary word equals it |
| **Capitalized**: the first cased character is upper case or title case, and every later cased character is lower case (`Pikachu`) | the word itself, or the NFC of its lower-case mapping, is in the dictionary |
| **Anything else** (`pikachu`, `iPhone`, `pIkachu`) | the word itself is in the dictionary |

* "Cased", "upper case", "lower case" and the case mappings are Unicode's default, language-independent definitions ([Unicode §3.13, "Default Case Algorithms"](https://www.unicode.org/versions/latest/core-spec/chapter-3/)), with full mappings, so the upper-case form of "ß" is "SS".
* Characters without case, such as digits, apostrophes and combining marks, are ignored when deciding the shape of a word, so `'Tis` counts as capitalized.
* Scripts without case, such as Chinese, Japanese, Arabic and Hebrew, always fall into the last row, so their words match exactly.

`removeWords()` does not map case: it removes the NFC form of each word exactly as given. `Pikachu` and `pikachu` are separate entries that a page may have added for different reasons, so `removeWords(["Wolvic"])` does not remove `wolvic`.

#### Prior art

This is the rule the major spell checkers already apply to the words in their built-in dictionaries, so a page's words behave like the dictionary words users already know:

* **Hunspell** (Firefox, LibreOffice, and Chromium on Linux and ChromeOS) accepts a lower-case dictionary word when it is capitalized or in all capitals, and never accepts a capitalized word in lower case. Upstream Hunspell also accepts the all-caps form of a mixed-case word (`IPHONE` for `iPhone`).
* **macOS and iOS** (`NSSpellChecker`, `UITextChecker`) apply the same rule to their built-in dictionary, and are more lenient in one respect: they also accept other mixed-case forms of a lower-case word, such as `aPPle` for `apple`.

Spell checkers treat *words added by the user* less consistently. Firefox matches them exactly, and case-sensitively, and so does Chromium's own filter, although on macOS and Windows Chromium also adds them to the system spell checker, which applies its own rules. The Enchant personal word list (WebKitGTK, WPE) uses the rule above, except that it matches mixed-case words only as written. macOS and iOS ignore case entirely for learned words, and so does macOS for ignored words (see [Alternatives Considered §6](#6-case-insensitive-matching)). With exact matching, a word the user has added is still flagged when it starts a sentence.

A fuller comparison of how spell checkers handle case, and of the options considered for this API, is in [Case handling in the SpellCheckCustomDictionary API: analysis and proposal](case-handling-analysis-proposal.md).

#### Limitations

Without a language, the default case mappings cannot handle every language's capitalization rules:

* **Turkish and Azerbaijani.** The default mappings pair "i" with "I", so adding `istanbul` accepts `ISTANBUL` but not `İSTANBUL`.
* **Greek.** Default upper-casing keeps accents, so adding `Αθήνα` accepts `ΑΘΉΝΑ` but not the unaccented `ΑΘΗΝΑ` usual in Greek typography.
* **Dutch.** "IJ" is capitalized as a unit, so adding `ijsselmeer` accepts `Ijsselmeer` but not `IJsselmeer`.

Separately, the upper-case form of "ß" is "SS", in German as well as by default, so adding `straße` accepts `STRASSE` but not `STRAẞE`, written with the capital sharp s "ẞ" (U+1E9E).

In each case the page can add the other form explicitly. Language-aware mapping, which would close the Turkish, Azerbaijani, Greek and Dutch gaps, is listed under [Future Work](#future-work).

#### Word boundaries

The dictionary does not segment text itself: it is compared against the words the platform spell checker has already flagged, so an entry only helps when it matches the checker's word boundaries. That is not always the case:

* **Compounds.** If a checker flags `Wolvicbrowser` as one word, adding `Wolvic` does not suppress it.
* **Attached words.** In Arabic, "and" (و) is written attached to the following word, so adding `كتاب` ("book") does not suppress `وكتاب` ("and a book").
* **Multiple words.** Each flagged word is compared on its own, so an entry containing a space never matches.
* **Scripts without spaces.** Chinese, Japanese and Thai are rarely spell-checked today. Where they are, the checker's segmentation decides what a "word" is, and it may split a name the page added as one entry.

Word boundaries, including how hyphens and apostrophes split words, also differ between spell checkers, so the same entry can match on one platform and not on another. Matching parts of a flagged word is discussed under Fuzzy matching in [Future Work](#future-work).

<details>
	<summary><strong>Implementation notes</strong></summary>

The existing spell-check pipeline is unchanged. The custom set is consulted only when results are reconciled: a token that would otherwise be flagged is suppressed if it matches a word in the document's custom dictionary (see [Matching](#matching)). The check is strictly **additive**; that is, the custom dictionary can only suppress a flag, never create one. A word that overlaps with an underlying dictionary is expected and inert. `removeWords()` affects only the custom set and never the underlying dictionaries, so removing an overlapping word does not cause it to be flagged.

How a word gets added so it is no longer flagged depends on the operating system, and the behavior is inconsistent. On some platforms such words are learned directly into a global, system-wide dictionary that persists and is shared with every application on the device; on others they are kept by the browser. This API sidesteps that entirely: rather than write into any underlying engine or system dictionary, the browser applies the custom dictionary as a suppression step over whatever results an engine returns. The dictionary lives **entirely within the browser, scoped to a single document**. Therefore, added words only filter what the browser renders, never persist beyond the document’s lifetime, and never leak into the OS spellchecker or other applications.

</details>

## Alternatives Considered

### 1. An `ObservableArray` Type for the Dictionary
<details>

The Spell Check Custom dictionary is a collection of word strings. One option is to introduce an array attribute to represent the dictionary. Since the dictionary is mutable, an `ObservableArray` type as suggested [here](https://github.com/WebAudio/web-speech-api/pull/169#issuecomment-3006838443) could be ideal.

`ObservableArray` offers developers great choices of standard Array methods. This provides the convenience of manipulating the dictionary with functionalities by calling standard Array methods. However, we decided not to take this route because it re-exposes the read surface this API withholds. As [TAG review comments](https://github.com/w3ctag/design-reviews/issues/1191) noted, "All of the spell check-related things are carefully designed to not be observable, it might be good to not have additional methods to see inside". The write-only `addWords()`/`removeWords()` pair exists precisely so there is no enumerable object to probe.

</details>

### 2. A SetLike interface
<details>
For the interface, a natural alternative would be `SetLike<DOMString>`, a Set-shaped surface (`add`, `delete`, `has`, `size`, `clear`, iteration) — familiar to authors who know JavaScript's `Set`. However, we chose not to use it because:

* Privacy would be compromised. Exposing the read operations of the interface lets any script with access to the dictionary enumerate or probe its contents.
* Batch shape matches caller intent and scales. SetLike's ```add(value)``` is single-element. In most common use cases, callers push lists, so on a SetLike surface they end up coalescing via ```forEach```. The bespoke ```addWords(sequence<DOMString>)``` we propose matches caller intent, batches cleanly, and remains a single operation.
* The cost of a bespoke surface is a small ergonomic one — authors learn ```addWords / removeWords``` instead of ```add / delete```.

</details>

### 3. A Unified `CustomDictionary` Across Features
<details>

Domain-specific vocabulary matters beyond spell checking. The [Web Speech Contextual Biasing API](https://github.com/WebAudio/web-speech-api/blob/main/explainers/contextual-biasing.md) addresses somewhat similar needs for transcription, and text-to-speech may eventually need pronunciation hints for the same terms. The proposed [Proofreader API](https://github.com/webmachinelearning/proofreader-api?tab=readme-ov-file#interaction-with-other-browser-integrated-proofreading-features) also has a need for some kind of related features, as would, for example [translation APIs](https://github.com/webmachinelearning/translation-api/issues/9).

Abstractly, a shared `CustomDictionary` abstraction could in principle serve all of these. However, we decided against this for the following reasons:

* Chromium already ships the Web Speech biasing feature unprefixed, and Firefox is close behind, leaving little room for redesign.
* Browsers can already choose to treat Web Speech terms as valid for spell checking (or vice versa) without any additional API surface, or via later convenience methods.  That is, if it is clear this is always desired - but it is not.

Authors who want to share vocabulary between both APIs today can do so:

```javascript
document.spellCheckCustomDictionary.addWords(recognition.phrases.map(p => p.phrase));
```

If this pattern is still taxing or inefficient, we can always consider adding a convenience method later. For now, keeping the API minimal helps avoid premature abstraction.
</details>

### 4. Declarative `<link>`
<details>
A natural question is whether we could just make this declarative.  Perhaps something like:

```
<link rel="custom-dictionary" href="lotr.words">
```

This would have several advantages in that it is very easy for authors to use in most cases, gets link semantics, preloading, and CORS handling for free, and needs no script.

Given such a tag, we technically wouldn't even need an additional API surface as adding a link would add words to the dictionary and removing the link would remove them.

On balance, though, there are advantages to a JavaScript based interface and we believe it's worth doing that first for two reasons:

  * As shown above, it makes it easier and more efficient to share terms among APIs with similar needs
  * We currently lack a `rel` type or agreed serialization format, which also generally happen in a different space of browser architecture. `fetch` and `json` are pretty easy ways to achieve mostly similar results and require nothing new.
  * Some use cases involve runtime-fetched vocabularies — e.g., a financial-news application receiving symbol lists from a server, where words arrive in a JavaScript execution context and ```addWords(response)``` is the direct path. A declarative form would either require server-side rendering of the word list (not always feasible when content is per-user or per-session) or amount to writing JavaScript that creates DOM nodes to declare words — strictly more roundabout than the imperative call.

Given this, while we believe it is a potentially worthwhile pursuit in future iterations, it makes the most sense to begin with the imperative API.
</details>

### 5. DOM subtree scoped

<details>
Choosing scope for the API largely depends on use cases. For example, Document-scoped is enough for whole-page vocabularies, while subtree-scoped wins when multiple forms on one page need distinct vocabularies, or when web components want isolation. We would say that Document scope and DOM-subtree scope are not mutually exclusive — document scope is merely the simplest form, which we can continue to build on more specifically in the future if desired.

We propose to proceed with document-scoped first as it's a more conservative, easier-to-spec choice, while leaving the door open for adding a partial interface HTMLElement later if multi-vocabulary scenarios emerge (See [Future Work](#future-work))
</details>

### 6. Case-insensitive matching

<details>

Matching could ignore case entirely, by comparing words after Unicode [case folding](https://www.unicode.org/reports/tr44/#CaseFolding.txt). This is what macOS and iOS do for words the user learns, and macOS for words the user ignores, so an implementation built on `ignoreWord:inSpellDocumentWithTag:` would get it for free. We chose not to:

* **Capitals can be part of the spelling.** With case folding, adding "Paris" or "US" would also accept "paris" and "us".
* **Folding changes more than case.** "ß" folds to "ss", so adding "Straße" would also accept "Strasse". In German that is a different spelling (Swiss orthography), not a different capitalization.
* **Removal would fold too.** Removing "pikachu" would also remove a separately added "Pikachu".

Folding suits a single user's personal dictionary, where the user decides what to add and a lost capital costs little. A page's words are applied to text the user types, so accepting a wrong capitalization of the page's proper noun hides a real error from the user. Because the result differs from Apple's handling of user words, an implementation on Apple platforms has to apply the [case-mapping rule](#case-mapping) itself rather than delegate to `ignoreWord:inSpellDocumentWithTag:`.

Exact, case-sensitive matching was also considered. It is the simplest rule, but it forces pages to add every capitalization of every word ("wolvic", "Wolvic", "WOLVIC") to cover sentence starts and headings, and every variant a page misses shows up as a false spelling error.

</details>

### 7. Compatibility normalization (NFKC)

<details>

Words could be compared after [Normalization Form KC (NFKC)](https://unicode.org/reports/tr15/#Norm_Forms) instead of NFC. NFKC also merges *compatibility* variants: the ligature "ﬁ" becomes "fi", full-width "Ｗｏｌｖｉｃ" becomes "Wolvic", the superscript in "m²" becomes "2", and the long "ſ" becomes "s". This would help in one case: text pasted from a PDF that uses ligatures would match a word added without them. We chose not to:

* **Compatibility variants are different characters.** [UAX #15](https://unicode.org/reports/tr15/#Canon_Compat_Equivalence) describes canonically equivalent sequences as representing "the same abstract character", so treating them as one word loses nothing. Compatibility equivalence is "a weaker type of equivalence" between characters that "may have distinct visual appearances or behaviors". UAX #15 warns that the compatibility forms NFKC and NFKD "must not be blindly applied to arbitrary text", because "they may remove distinctions that are important to the semantics of the text".
* **The differences are often deliberate.** Full-width Latin letters are a normal style in Chinese, Japanese and Korean text, superscripts carry meaning ("m²" is not "m2"), and mathematical letters such as "𝐱" are different symbols from "x". A dictionary should not decide that these are spelling variants of each other.
* **It would accept text the page never added.** Adding "m2" would also suppress "m²", and adding "Wolvic" would also suppress "Ｗｏｌｖｉｃ". The rule in [Matching](#matching) only ever accepts the word as added, in another encoding or with more capitals.
* **The case it helps is rare, and easy to cover.** A page that expects ligatures or full-width text can add those forms explicitly.

UAX #15 notes that the compatibility forms "can be applied more freely to domains with restricted character sets", such as identifiers ([UAX #31](https://www.unicode.org/reports/tr31/)). Spell checking works on open-ended prose, where the author's choice of character should be kept.

</details>

---

## Accessibility, Internationalization, Privacy & Security

### Accessibility
This API has no direct effect on the accessibility tree or assistive technology. Reducing false spell-check positives may modestly benefit users who rely on screen readers, by reducing noise from incorrectly flagged words being announced as errors.

### Internationalization
Words added via this API apply across all user-enabled languages, matching the behavior of the existing browser custom dictionary. Sites can simply load different dictionaries as appropriate if desired. No language-targeting beyond what already exists is introduced.

Words are compared after Unicode NFC normalization, using the language-independent default case mappings, so matching does not depend on the input method or on the user's or the page's language. See [Matching](#matching), including the language-specific cases this does not cover.

### Privacy

- **Transient data.** The custom dictionary is discarded when the document or tab closes.

- **No dictionary probing.** This API exposes no read method to script and a page can only observe words it supplied itself. A known issue with a highlight side channel — which lets a page probe dictionary membership by timing `::spelling-error` / `::grammar-error` highlight rendering — is being addressed in [css-pseudo `#highlight-security`](https://drafts.csswg.org/css-pseudo/#highlight-security) and the [user-dictionary-leaks proposal](https://github.com/explainers-by-googlers/user-dictionary-leaks). The same highlight side channel could, in principle, be used to *guess the contents of the custom set itself*, so closing that side channel would benefit this API too.

- **The dictionary is local to the document it's associated with.** Details are discussed at [The Per‑Document Design in Chromium](https://docs.google.com/document/d/1ND1a1Z4i6kXMHqMwEyRkHSj5VVTWgX5Ya0aNLgVQYGw/edit?tab=t.0#heading=h.kmfizh6cwyy4)


### Security

- **No new network exposure.** The API does not require network access and does not introduce new privacy risks.

- **Third-party iframes.** Because the dictionary is scoped per document, every iframe — including cross-origin, third-party frames — gets its own independent dictionary. An embedded third party can only add or remove words for *its own* document. A detailed discussion for the Chromium case can be found at [The Per‑Document Design in Chromium](https://docs.google.com/document/d/1ND1a1Z4i6kXMHqMwEyRkHSj5VVTWgX5Ya0aNLgVQYGw/edit?tab=t.0#heading=h.kmfizh6cwyy4).

- **Resource Limits and Abuse Mitigation**

It is noted that rapid `addWords()` / `removeWords()` churns can cause waste of resources. To prevent a page from flooding or abusing the dictionary, it is recommended to introduce:
  - Implementation-defined limits — a user agent may cap the number of words and the length of each word.
  - Well-defined behavior at the limit — surplus words are ignored rather than corrupting existing state or breaking the page.

## Relationship to Other Tools & APIs

### Built-in AI APIs (Proofreader)

The [Proofreader API](https://github.com/webmachinelearning/proofreader-api) explainer references this API as a potential model for handling proper names and acronyms, while stating it is "moving forward without integration with custom dictionaries until further exploration and evaluation are done." We take the same position from this side — the features are complementary but should ship independently first — for a few reasons:
- **Different operations.** This API suppresses a spell-check flag by matching a flat string set layered over the platform spellchecker. A proofreader is generative and contextual; "accept this word" from a proofreader is a fuzzier operation than "don't flag this token," and is not simply a set-membership test.
- **The surfaces are still early**. Questions are better resolved once both APIs are more settled.

### Browser Extensions (Grammarly)
Writing-assistant extensions such as *Grammarly* and *LanguageTool* run their own checking engine, independently of the browser's built-in spellchecker. Because this API layers onto the *built-in* spellchecker, it should not have automatic effect on these extensions: an extension neither consults nor is bound by the page's custom dictionary, and keeps using its own per-user vocabulary.

## Stakeholder Feedback / Opposition

| Stakeholder | Signal |
|-------------|--------|
| Chrome | Positive — implementation in progress |
| Safari | https://github.com/WebKit/standards-positions/issues/646 |
| Firefox | https://github.com/mozilla/standards-positions/issues/1384 |
| TAG | [Satisfied with Concerns](https://github.com/w3ctag/design-reviews/issues/1191) |

---

## Future Work

The current proposal is intentionally minimal in scope. A few directions have come up during discussion that we think are worth pursuing, but only once the core API has shipped and settled:

* **Declarative authoring.** A `<link rel="custom-dictionary" href="...">`-style declarative form (see [Alternatives Considered §4](#4-declarative-link)) could make the common case easier to author and get preloading, CORS, and link semantics for free. We'd want an agreed serialization format before pursuing this, and an answer to the question of whether more specific subtree-scoped dictionaries make sense.

* **Subtree-scoped dictionaries.** Today the dictionary is scoped to the whole `Document`. A `partial interface HTMLElement` (see [Alternatives Considered §5](#5-dom-subtree-scoped)) could let pages scope distinct vocabularies to individual forms or web components, for cases where a single page legitimately needs more than one vocabulary at once.  Note that this is neither how user dictionaries work today, nor is it currently well supported in spell-checking with regard to languages in general.  We imagine it being rather straightforward to adapt in terms of API by simply adding a lang as an optional secondary argument to each of the methods.

* **Language-aware case mapping.** With an optional language argument (see **Subtree-scoped dictionaries** above), matching could use a language's own case mappings, such as Turkish "i" and "İ", accentless Greek capitals and Dutch "IJ", closing those language-specific gaps listed under [Matching](#limitations). Words added without a language would keep the default behavior, so the current rule does not block this.

* **Per-word case control.** A page might want a word to match only exactly as written, like Hunspell's `KEEPCASE` flag, for example when its all-caps form is a different word. This could be an option to `addWords()`, but should wait for evidence that pages need it.

* **Fuzzy matching.** Today the dictionary is based on exact matches, adjusted only for Unicode normalization and capitalization (see [Matching](#matching)), for many reasons laid out in other sections.  This is not always the most author convenient way to express things, and in fact does not offer real solutions for some languages.  It also means that the list is generally not integrated with spelling _suggestions_.  These are different features, and at most would ideally share some _source_ list.  We propose that there are opportunities to identify source lists in a few possible ways ([simple partial matching](https://github.com/Igalia/explainers/issues/94), or even fuller solutions like hunspell, etc), and that we can identify these at a later time.  It should always be possible to require a particular spelling, so let's start there.

* **Convenience integration with related APIs.** Sharing vocabulary with the [Web Speech Contextual Biasing API](https://github.com/WebAudio/web-speech-api/blob/main/explainers/contextual-biasing.md), translation APIs, or a future [Proofreader API](https://github.com/webmachinelearning/proofreader-api) integration is possible today by passing the same word list to both APIs manually. If this pattern proves common or inefficient in practice, a convenience method to share vocabulary across APIs could be considered later.

* **Resource-limit standardization.** Limits on word count and word length are currently left implementation-defined. As implementations gain experience, it may be worth revisiting whether these limits should be more tightly specified for interoperability.

None of these are required for an initial, useful version of the API, and we'd rather ship a small, well-understood surface first than delay on speculative extensions.

---

## References & Acknowledgements

* Chromium design document: [The Per‑Document Design in Chromium](https://docs.google.com/document/d/1ND1a1Z4i6kXMHqMwEyRkHSj5VVTWgX5Ya0aNLgVQYGw/edit?tab=t.0#heading=h.kmfizh6cwyy4)
* [Web Speech Contextual Biasing API](https://github.com/WebAudio/web-speech-api/blob/main/explainers/contextual-biasing.md)
* [Hunspell library](https://hunspell.github.io/)
* [Cocoa Spell Checking API](https://developer.apple.com/documentation/appkit/nsspellchecker)
* [Windows native spellcheck API](https://learn.microsoft.com/en-us/windows/win32/api/spellcheck/)
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
