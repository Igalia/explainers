# SpellCheckCustomDictionary — Dev Trial instructions

Feature entry: https://chromestatus.com/feature/6185007701557248
Explainer: https://github.com/Igalia/explainers/tree/main/spell-check-dictionary

  The ```SpellCheckCustomDictionary``` API lets a page add words to a per-document custom dictionary so the spell checker stops flagging them as misspellings.

  Typical use: an editor whose content contains domain vocabulary, product names etc. that the user should not see squiggled when spell checking is enabled.
 
## Enabling the feature

  Either enable "**Experimental Web Platform Features**" in ```chrome://flags```, or launch Chrome from the command line with the Blink feature enabled:

```  
chrome --enable-blink-features=SpellCheckCustomDictionaryAPI
```
## Prerequisites

  All of the following must hold, and they fail in two different ways.

  Items 1–4 decide whether the interface exists at all, as does the feature flag above: if any is missing, ```document.spellCheckCustomDictionary``` is ```undefined``` and calling ```addWords()``` on it throws a ```TypeError```.

  Items 5 and 6 decide whether the calls have any effect. They do not throw: ```addWords()``` and ```removeWords()``` return normally and nothing changes.

  1. Chrome Canary or Dev, milestone 153 or newer (developed against 153.0.7983.0).
  2. Desktop — Linux, macOS, Windows, ChromeOS — or Android. Chrome on iOS ships on WebKit rather than Blink, so it has no Blink spell checker and the API is not exposed there. Android WebView is a separate case with its own setup and its own caveats; see [Android WebView Test Instructions](https://github.com/Igalia/explainers/blob/main/spell-check-dictionary/Android_WebView_Test_instructions.md).
  3. **Secure context**. ```https://``` or ```http://localhost```.
  4. **A Window context**. The interface is ```Exposed=Window```; it is not available in workers.
  5. **Spell checking turned on**. On Windows, Linux and ChromeOS: *chrome://settings/languages → Spell check → Spell check enabled, with at least one language selected and its dictionary downloaded*. On macOS the same *Spell check* toggle applies, but there is no language list or downloadable dictionary — checking is done by the system ```NSSpellChecker``` and the language follows the macOS setting.

     On Android there is no Chrome setting at all — spell checking comes from the Android system spell checker. Turn it on at *Settings → System → Languages & input → Spell checker* — the exact path varies by Android version and OEM — with a spell-check service and a language selected. If the device has no spell checker to turn on, one option is to install **Gboard** and select its spell checker as the service. Gboard registers a spell-check service with the system, which is enough to give Chrome a session to work with.
  6. **Text that actually gets spell checked**. A contenteditable element, a ```<textarea>```, or an ```<input type="text">```, without ```spellcheck="false"```.

## API surface

  ```
  [Exposed=Window, SecureContext]
  interface SpellCheckCustomDictionary {
    undefined addWords(sequence<DOMString> words);
    undefined removeWords(sequence<DOMString> words);
  };

  partial interface Document {
    [SameObject] readonly attribute SpellCheckCustomDictionary spellCheckCustomDictionary;
  };
  ```
  ## Example
  
```js
document.spellCheckCustomDictionary.addWords(["Igalia", "Wolvic", "spidermonkey"]);

document.spellCheckCustomDictionary.removeWords(["Wolvic", "spidermonkey"]);
```

Two tests in the Chromium tree exercise the API and are a good starting point:

  - [add-remove-words-manual.html](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/web_tests/wpt_internal/spell-check-custom-dictionary/add-remove-words-manual.html) — manual test, walks through adding and removing words in an editable.
  - [same-object.https.html](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/web_tests/wpt_internal/spell-check-custom-dictionary/same-object.https.html) — automated, checks the ```[SameObject]``` behaviour of the attribute.

  ## Behaviour to be aware of while testing

  These are current, intentional properties of the implementation. They are the parts we would most like feedback on.

  - **Document-scoped and non-persistent**. The word set belongs to the current document and is cleared on navigation. A page must re-add its words after every navigation, including same-origin ones.
  - **Write-only**. There is no way to enumerate or query the current set.
  - **Independent of the user's own dictionary**. Words added through this API do not appear in chrome://settings/editDictionary, are not synced, and do not affect other tabs. Conversely the user's existing custom dictionary continues to apply.
  - **Exact, case-sensitive matching**. Matching is a code-unit comparison against the flagged word, so there is no case folding — adding "Pikachu" does not suppress "pikachu" — and no Unicode normalization: a word added in NFC does not suppress the same word typed or pasted in NFD, which is worth watching for on macOS. For the same reason a multi-word entry never matches, since each flagged misspelling is compared on its own.
  - **Invalid entries are silently skipped**, matching the browser custom dictionary's validation: empty strings, words with leading or trailing whitespace, and ill-formed UTF-16 (unpaired surrogates). No error is raised.
  - **Limits**. 20,000 words per document, and 128 bytes (UTF-8) per word. The word cap applies to the **live** set, so ```removeWords()``` frees capacity again. An over-length word is skipped on its own, but once the cap is reached the rest of that call is dropped.
  ## Feedback

  - Spec/design discussion: file an issue on the explainer repository https://github.com/Igalia/explainers.
  - Implementation bugs: https://issues.chromium.org/issues/428005649

