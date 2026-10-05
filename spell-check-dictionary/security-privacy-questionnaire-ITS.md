# Security & Privacy Self-Review: Spell Check Custom Dictionary API

Answers to the [W3C Security and Privacy Questionnaire](https://www.w3.org/TR/security-privacy-questionnaire/) for `document.spellCheckCustomDictionary`.

- Explainer: https://github.com/Igalia/explainers/tree/main/spell-check-dictionary
- Spec PR: https://github.com/whatwg/html/pull/12590

## Summary of the design in Chromium implementation

- **Write-only surface.** `addWords(sequence<DOMString>)` and `removeWords(sequence<DOMString>)` both return `undefined`. There is no way to read, enumerate or query the dictionary, and nothing reveals whether a word was already known.
- **Secure contexts only** (`[SecureContext]`).
- **Scoped to one document.** Words are held in a per-frame set in the renderer(`SpellCheckProvider::document_custom_words_`) and cleared when a new document is created in the frame (`DidCreateNewDocument`). Each frame, including every iframe, has its own set.
- **Never leaves the renderer.** Words are not sent over IPC to the browser process, the OS spellchecker or the Enhanced Spell Check (cloud) service. They are applied only as a renderer-side filter over results from Hunspell, the platform spellchecker and the Enhanced Spell Check service. The user's custom dictionary (browser/OS) is never read or modified. `removeWords()` only affects words the page itself added.
- **Input validation.** Empty words, words with leading/trailing whitespace, and ill-formed UTF-16 (unpaired surrogates) are rejected.
- **Resource limits.** At most 20,000 words per document
  (`kMaxDocumentCustomDictionaryWords`) and 128 UTF-8 bytes per word
  (`kMaxDocumentCustomDictionaryWordBytes`). The cap bounds the live set, not total churn. Excess additions are dropped, and a single console warning is logged per document.

## Questionnaire

### 2.1 What information does this feature expose, and for what purposes?
None. The API is write-only: it lets a page supply words that its own editable content should not flag as misspelled. No information is returned to the page.

### 2.2 Do features in your specification expose the minimum amount of information necessary to implement the intended functionality?
Yes. Nothing is exposed. Spelling markers themselves are not observable from script, so the effect of the API cannot be read back either.

### 2.3 Do the features in your specification expose personal information, personally-identifiable information (PII), or information derived from either?
No. The API never reads the user's custom dictionary, spellcheck languages or OS dictionaries, and never reports anything back to the page.

### 2.4 How do the features in your specification deal with sensitive information?
They don't handle any. The words come from the page and stay with that page's document.

### 2.5 Does data exposed by your specification carry related but distinct information that may not be obvious to users?
No data is exposed.

### 2.6 Do the features in your specification introduce state that persists across browsing sessions?
No. The dictionary lives in memory only, is not written to disk or synced, and is dropped when the document goes away.

### 2.7 Do the features in your specification expose information about the underlying platform to origins?
No. In particular, the API does not reveal which spellchecker is in use (Hunspell, the platform spellchecker, or Enhanced Spell Check), which languages are enabled, or the contents of the user's dictionary.

### 2.8 Does this specification allow an origin to send data to the underlying platform?
No. In Chromium the words stay in the renderer process and are applied as a filter over spellcheck results. They are not passed to OS spellchecking APIs, the browser process or the Enhanced Spell Check service, and never enter the user's personal dictionary.

### 2.9 Do features in this specification enable access to device sensors?
No.

### 2.10 Do features in this specification enable new script execution/loading mechanisms?
No.

### 2.11 Do features in this specification allow an origin to access other devices?
No.

### 2.12 Do features in this specification allow an origin some measure of control over a user agent's native UI?
Minimal. A page can stop spelling markers (squiggles), and the matching "misspelled" state, from appearing on the listed words in its own editable content. That is roughly what `spellcheck="false"` already allows, but at word level. The user's own dictionary and settings are untouched.

### 2.13 What temporary identifiers do the features in this specification create or expose to the web?
None.

### 2.14 How does this specification distinguish between behavior in first-party and third-party contexts?
Each document has its own dictionary. A third-party (cross-origin) iframe can only affect its own document's editable content. It cannot read or change the embedding page's dictionary, and the embedder cannot touch the iframe's.

### 2.15 How do the features in this specification work in the context of a browser's Private Browsing or Incognito mode?
The same as in normal mode. Because nothing is persisted, there is no difference to hide.

### 2.16 Does this specification have both "Security Considerations" and "Privacy Considerations" sections?
The explainer has "Privacy" and "Security" sections.

### 2.17 Do features in your specification enable origins to downgrade default security protections?
No.

### 2.18 What happens when a document that uses your feature is kept alive in BFCache (instead of getting destroyed) after navigation, and potentially gets reused on future navigations back to the document?
The dictionary belongs to the document, so a document restored from BFCache keeps the words it had added. A new document never inherits another document's words.

### 2.19 What happens when a document that uses your feature gets disconnected?
The dictionary goes away with the document. Calls made while the document has no frame, or while spellchecking is disabled, do nothing.

### 2.20 Does your spec define when and how new kinds of errors should be raised?
No new errors are raised. Invalid words are skipped silently, and additions beyond the limits are dropped, with a console warning in Chromium. This avoids giving the page an oracle about internal state.

### 2.21 Does your feature allow sites to learn about the user's use of assistive technology?
No.

### 2.22 What should this questionnaire have asked?
Whether the feature's input is merged into any user-owned or persistent data store. For this API the answer is no: page-supplied words are kept separate from the user's personal dictionary.
