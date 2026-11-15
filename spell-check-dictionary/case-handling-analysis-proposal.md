# Case handling in the SpellCheckCustomDictionary API: analysis and proposal

Words added through `document.spellCheckCustomDictionary.addWords()` are
currently matched exactly, so adding `wolvic` leaves `Wolvic` at the start of a
sentence flagged. (CL 8726049, in review, adds Unicode normalization but does
not change case handling.) This document:

1. defines the two Unicode operations involved, case mapping and case folding;
2. describes how browsers and platforms handle case today;
3. proposes a rule for the API, and explains why;
4. outlines future work that builds on the proposal.

## 1. Concepts: case mapping and case folding

Unicode defines two different operations for dealing with case. They are often
both loosely called "case folding", but they behave differently, and the
difference decides what a spell checker can express.

### 1.1 Case mapping

Case mapping converts text to a particular case form. Unicode §3.13 "Default
Case Algorithms" defines three, based on `UnicodeData.txt` and
`SpecialCasing.txt`:

| Operation | Example |
|---|---|
| `toLowercase` | `London` → `london` |
| `toUppercase` | `London` → `LONDON` |
| `toTitlecase` | `london` → `London` |

Properties:

* **Directional.** Each operation produces one specific form. Whether
  `London` and `london` count as the same word depends on which mapping the
  caller chooses to apply, and to which side.
* **Full mappings can change length.** `toUppercase("ß")` is `SS`.
* **Context rules exist, but default mappings need no language.** Greek
  capital sigma lowercases to final `ς` at the end of a word and to `σ`
  elsewhere, by a language-independent rule.
* **Languages can tailor them.** In Turkish, `toUppercase("i")` is `İ` and
  `toLowercase("I")` is `ı`. The default mappings, used when no language is
  known, pair `i` with `I` instead.

### 1.2 Case folding

Case folding turns text into a single key for **caseless comparison**. It is
defined in `CaseFolding.txt`:

| Input | Folded key |
|---|---|
| `London`, `london`, `LONDON` | `london` |
| `Straße`, `STRASSE`, `strasse` | `strasse` |
| `ΟΔΟΣ`, `οδος`, `οδοσ` | `οδοσ` |

Properties:

* **Symmetric.** Every casing of a word folds to the same key, so all casings
  match each other. There is no way to say "`London` but not `london`".
* **Goes beyond case.** It also merges look-alike forms that are not a matter
  of capitalization: `ß` → `ss`, final `ς` → `σ`.
* **Mostly language-independent.** The only tailoring is an optional Turkic
  variant for `I` and `ı`.

### 1.3 Why the difference matters

A spell checker wants to accept a word written with extra capitals, at the
start of a sentence (`Wolvic is…` from `wolvic`) or in a heading (`IPHONE
REVIEW` from `iPhone`), while still catching words written with too few
capitals (`i live in paris` when only `Paris` is valid).

* **Case mapping can express that.** Given a typed word, the checker
  generates a few case variants and looks each one up, choosing which
  direction is allowed.
* **Case folding cannot.** Once two casings fold to the same key, the
  checker cannot tell whether capitals were added or removed.

## 2. Current case handling across browsers and platforms

### 2.1 Built-in dictionaries: case mapping

For their built-in dictionaries, the major spell checkers share one core rule:
**a word also matches forms with more capitals (a capitalized first letter, or
all capitals), but never a form with fewer capitals than it is stored with.**
`apple` matches `Apple` and `APPLE`; `London` does not match `london`; `iPhone`
does not match `iphone`.

They implement it with case mapping. Hunspell, for example, classifies the
typed word and tries a short ladder of lookups:

| Typed word | Hunspell looks up |
|---|---|
| lower case or mixed case (`pikachu`, `aPPle`, `iPhone`) | the word as typed only |
| title case (`Pikachu`) | `Pikachu`, then `pikachu` |
| all caps (`PIKACHU`) | `PIKACHU`, then `Pikachu`, then `pikachu` |

The checkers differ at the edges:

| Built-in dictionary | Mixed case on a lower-case word (`aPPle`) | All-caps form of a mixed-case word (`IPHONE`) | Refinements |
|---|---|---|---|
| Hunspell (Firefox, LibreOffice; Chromium on Linux and ChromeOS, and on Windows for languages the system spell checker does not support) | Flagged | Accepted by upstream Hunspell, which adds a hidden all-caps form when it loads a `.dic` file. Flagged in Chromium, whose `.bdic` loading path never creates it. | Per-word `KEEPCASE` and `FORBIDDENWORD` flags; language-aware rules such as German `ß` (`CHECKSHARPS`) and Turkish `i` |
| macOS and iOS (`NSSpellChecker`, `UITextChecker`; Safari, and Chrome on macOS) | Accepted | Accepted | None |
| Windows (`ISpellChecker`; Chrome on Windows by default) | Not measured | Not measured | Not measured |

### 2.2 Words added by the user: folding, mapping or exact

| User-added words | Mechanism | Case handling |
|---|---|---|
| macOS and iOS (`learnWord:`, and `ignoreWord:inSpellDocumentWithTag:` on macOS); used by Safari | **Case folding** | Full Unicode default case folding, in both directions. Learning `Pikachu` also accepts `pikachu`. `ß` ↔ `ss` and `ς` ↔ `σ` fold. The Turkic variant is not used, so `ı` and `I` stay distinct. Diacritics are not ignored: `ü` does not match `u`. Removal folds too: unlearning `PIKACHU` removes a learned `pikachu`. |
| Enchant personal word list (WebKitGTK, WPE) | Case mapping | The built-in rule from 2.1, except that mixed-case words match only exactly: `iPhone` does not match `IPHONE`. |
| Firefox personal dictionary | Exact | Case-sensitive. Users must add each capitalization separately. |
| Chromium profile custom dictionary | Exact, plus the platform | Chromium's own filter is case-sensitive. On macOS, "Add to dictionary" also calls `learnWord:`, so Apple's folding applies too. On Windows it also calls `ISpellChecker::Add`, whose case handling has not been measured. |

The `ß` ↔ `ss` and `ς` ↔ `σ` results are what identify Apple's user dictionary
as true case folding: neither can come from mapping a single word to upper or
lower case.

### 2.3 The SpellCheckCustomDictionary API today (Chromium)

| Property | Behavior |
|---|---|
| Unicode normalization | None yet: words are compared code unit by code unit. CL 8726049 (in review) stores and compares words in NFC, so canonically equivalent spellings match. |
| Case | Exact, like Firefox's personal dictionary. Adding `Pikachu` does not suppress `pikachu`, and adding `pikachu` does not suppress `Pikachu` or `PIKACHU`. |
| `removeWords()` | Removes the word as given (its NFC form, with CL 8726049). |

With exact matching of user words, as in Firefox and in Chromium's own
filter, a word added once is still flagged at the start of a sentence or in a
heading. We have not collected bug reports or user feedback on this; it follows
from the matching rule.

### 2.4 Evidence

* **macOS:** measured with `NSSpellChecker` probes, including Safari's "Learn
  Spelling" read back from a separate process.
* **iOS:** measured by calling `UITextChecker` under Mac Catalyst, not on a
  device.
* **Hunspell and Enchant:** read from source (`hunspell.cxx`, `hashmgr.cxx`,
  Enchant's `pwl.vala`), not executed.
* **Windows `ISpellChecker`:** not measured.

## 3. Proposal

Apply the built-in dictionaries' rule from 2.1 to the page's words, using
Unicode's default (language-independent) **case mapping**. A word matches
forms with more capitals than it was added with (a capitalized first letter,
or all capitals), never forms with fewer.

### 3.1 Matching rule

Classify the flagged word by its shape, then compare in NFC:

| Flagged word | Matches when |
|---|---|
| **all caps** (`PIKACHU`, `STRASSE`): has at least one cased character, and every cased character is upper case | `NFC(toUppercase(entry))` equals it, for some entry |
| **title case** (`Pikachu`): the first cased character is upper case or title case, and every later cased character is lower case | the word itself, or `NFC(toLowercase(word))`, is an entry |
| **anything else** (`pikachu`, `iPhone`, `aPPle`) | the word itself is an entry |

Notes on the definitions:

* "Cased" and the mappings are Unicode's default ones (§3.13), applied without
  any language tailoring. Full mappings are used, so `toUppercase("ß")` is
  `SS`, and the language-independent final-sigma rule applies when
  lower-casing Greek.
* Characters that are not cased (digits, apostrophes, combining marks) are
  skipped when classifying, so `'Tis`, `3Dmark` and `O'Neill` classify
  sensibly.
* Text in scripts without case (CJK, Arabic, Hebrew, and so on) is never all
  caps or title case, so it is matched exactly, as today.
* Results of a mapping are normalized to NFC again, because some mappings
  produce text that is not in NFC. For example `toLowercase("İ")` is `i`
  followed by U+0307.

### 3.2 Examples

| Word added | Accepted | Still flagged |
|---|---|---|
| `pikachu` | `pikachu`, `Pikachu`, `PIKACHU` | `pIkachu` |
| `Pikachu` | `Pikachu`, `PIKACHU` | `pikachu` |
| `iPhone` | `iPhone`, `IPHONE` | `iphone`, `Iphone` |
| `NASA` | `NASA` | `Nasa`, `nasa` |
| `straße` | `straße`, `Straße`, `STRASSE` | `strasse`, `Strasse` |
| `istanbul` | `istanbul`, `Istanbul`, `ISTANBUL` | `İSTANBUL` (see 3.4) |

The all-caps rule compares upper-cased forms rather than walking down a
lowercase/title-case ladder. That gives `iPhone` → `IPHONE` (matching upstream
Hunspell and Apple) and `straße` → `STRASSE`, both without language data.
Since only the all-caps direction maps, `strasse` and `Strasse` are still
flagged.

### 3.3 Removal

`removeWords()` removes the NFC form of each given word, exactly as today, with
no case mapping. `Pikachu` and `pikachu` are separate entries that a page may
add for different reasons, and removing one must not silently remove the
other.

### 3.4 Known limitations without a language tag

Each can be worked around by the page adding the other form explicitly.

* **Turkish and Azerbaijani.** Default mappings pair `i` with `I`, so adding
  `istanbul` accepts `ISTANBUL` but not `İSTANBUL`, and a word with the dotless
  `ı` does not match its Turkish upper-case form.
* **Greek.** All-caps Greek is usually written without accents, but default
  upper-casing keeps them, so adding `Αθήνα` does not accept `ΑΘΗΝΑ`.
* **Dutch.** `IJ` is capitalized as a unit (`IJsselmeer`), which classifies as
  mixed case, so only the exact form matches.
* **Lithuanian.** Dot handling on `i` with accents needs the language.
* **Mixed-case typing.** `aPPle` is flagged even if `apple` is added, which
  matches Hunspell but is stricter than Apple's built-in dictionary.

Separately, and not fixable with a language tag: the upper-case form of `ß` is
`SS` in German as well as by default, so adding `straße` accepts `STRASSE` but
not `STRAẞE`, written with the capital sharp s `ẞ` (U+1E9E).

## 4. Why this proposal

### 4.1 Requirements

1. **Sentence starts and headings.** A page that adds `wolvic` should not see
   `Wolvic` or `WOLVIC` flagged.
2. **Capitals that are part of the spelling stay.** Adding `Paris`, `iPhone` or
   `NASA` must not accept `paris`, `iphone` or `nasa`. Proper nouns, brand
   names and acronyms are the main vocabulary pages will add.
3. **No language tag.** `addWords()` takes plain strings, and the dictionary
   applies to all of the user's languages.
4. **Interoperable.** The rule must be specifiable by reference to Unicode, so
   that engines produce the same results.
5. **Predictable removal.** `removeWords()` should remove what the page added,
   and nothing else.
6. **Cheap.** Matching runs on every flagged word on pages that use the API.

### 4.2 Options compared

| | 1. Sentence starts, headings | 2. Spelling capitals kept | 3. No language tag | 4. Interoperable | 5. Predictable removal | 6. Cheap |
|---|---|---|---|---|---|---|
| **A. Exact matching** (today; Firefox user dictionary, Chromium's own filter) | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **B. Case folding** (Apple user dictionary) | ✓ | ✗ | ✓ | ✓ | ✗ | ✓ |
| **C. Default case mapping** (proposal; built-in dictionaries) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **D. Language-tailored case mapping** | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |

**A. Exact matching** forces pages to add every capitalization of every word
(`wolvic`, `Wolvic`, `WOLVIC`). A missed variant shows up to users as a false
spelling error, the same problem exact user dictionaries have at sentence
starts.

**B. Case folding** fixes sentence starts, and an implementation on Apple
platforms could simply delegate to `ignoreWord:inSpellDocumentWithTag:`. But:

* adding `Paris` or `US` also accepts `paris` and `us`;
* folding changes more than case: adding `Straße` also accepts `Strasse`, which
  in German is a different spelling (Swiss orthography), not a different
  capitalization;
* removal folds too, so removing `pikachu` would also remove a separately
  added `Pikachu`.

Folding is a reasonable choice for a single user's personal dictionary, where
the user decides what to add and a lost capital costs little. Words added by a
page are applied to text the user types, so accepting a wrong capitalization of
the page's proper noun hides a real error from the user.

**C. Default case mapping** meets every requirement. It also:

* matches the core rule of Hunspell's and Apple's built-in dictionaries, so a
  page's words behave like the dictionary words users already know;
* is defined entirely by Unicode §3.13, so engines can match each other
  exactly;
* handles `iPhone` → `IPHONE` and `straße` → `STRASSE` without language data,
  through the upper-case comparison in 3.1.

Its cost is the language-specific gaps in 3.4, each of which the page can work
around.

**D. Language-tailored mapping** would close those gaps, but needs a language
tag the API does not have. It can be added later on top of C (see
[Future work](#5-future-work)).

## 5. Future work

These build on the proposal and are not needed for a first version.

* **Language-tailored case mapping.** The explainer's Future Work section
  already floats an optional language argument for `addWords()` and
  `removeWords()`. With one, the three rules in 3.1 would use
  language-tailored mappings (the CLDR/ICU tailorings for `tr`, `az`, `lt`,
  `el` and `nl`), closing the language-specific gaps in 3.4. Pages that pass
  no language keep the default behavior, so adopting the proposal now does not
  block this (option D).
* **Per-word case control.** Hunspell dictionaries can mark a word `KEEPCASE`
  so that it matches only as written. A page might want the same for a word
  whose all-caps or title-case form is a different word. This could be an
  options argument to `addWords()`, for example `{ matchCase: "exact" }`. It
  should wait for evidence that pages need it.
* **The same rule for the profile custom dictionary.** Chromium's profile
  dictionary matches exactly in its own filter, so an added word is still
  flagged at the start of a sentence (2.3). Applying the rule in 3.1 there too
  would make user words and page words behave alike. That is a Chromium product
  change, separate from the web API.
* **All-caps of mixed-case words in Chromium's Hunspell.** Chromium's `.bdic`
  loading path flags `IPHONE` even though `iPhone` is in the dictionary
  (2.1), unlike upstream Hunspell. Fixing it, for example by generating the
  hidden forms in `convert_dict`, would make Chromium's built-in dictionary
  agree with the rule proposed here.

