
# Explainer: Force spelling and grammar markers

## Authors

- Stalgia Grigg <stalgiag@igalia.com>

## Table of Contents

- [Introduction & Motivation](#introduction--motivation)
- [Scope](#scope)
- [Goals](#goals)
- [Non-goals](#non-goals)
- [Proposed Approach](#proposed-approach)
- [Alternatives Considered](#alternatives-considered)
- [Accessibility, Internationalization, Privacy & Security](#accessibility-internationalization-privacy--security)
- [Relationship to Other Tools & APIs](#relationship-to-other-tools--apis)
- [Process & Stakeholder Feedback](#process--stakeholder-feedback)
- [Future Work](#future-work)
- [References & Acknowledgements](#references--acknowledgements)

## Introduction & Motivation

Browsers indicate spelling and grammar errors with markers (usually uniquely formatted underlines) and the web platform has built features based on these markers. The [`::spelling-error` and `::grammar-error`](https://drafts.csswg.org/css-pseudo-4/#selectordef-spelling-error) highlight pseudo-elements let pages style these markers and the [`text-decoration-line: spelling-error | grammar-error`](https://drafts.csswg.org/css-text-decor-4/#valdef-text-decoration-line-spelling-error) values expose the native error marker rendering to authors. The pseudo-elements ship in Chromium [(Chrome 121)](https://chromestatus.com/feature/4811776539492352) and WebKit ([Safari 17.4](https://webkit.org/blog/15063/webkit-features-in-safari-17-4/#styling-grammar-and-spelling-errors)). The related decoration values ship in all three engines ([Chrome 121](https://chromestatus.com/feature/4811776539492352), [Firefox 137](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/137#css), [Safari 26.2](https://webkit.org/blog/17640/webkit-features-for-safari-26-2/#text-decoration-improvements)).

Today, this family of features has little automated cross-browser test coverage. This has largely been blocked by the lack of affordances for making a marker exist on demand in a test environment.

The existing WPT reftests for the related pseudo-elements (`css/css-pseudo/spelling-error-*`, `grammar-error-*`) depend on a real checker producing markers before the screenshot is taken. In automation runs with no dictionaries and no focus/edit events, this never happens. On current Chrome, which ships both features, every automated test in the group that needs a marker fails.

 Engines have solved this for their own test suites with internal hooks that set markers directly:
 - [Blink's `internals.setMarker()`](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/testing/internals.cc;l=1309)
 - [WebKit's `Internals.setMarkerFor()`](https://github.com/WebKit/WebKit/blob/fd86b54293b5d6c3e9b9a07b5373afa488456f66/Source/WebCore/testing/Internals.cpp#L3143)

These exist only in test builds and are currently unreachable from release browsers under WebDriver. See [wpt#30863](https://github.com/web-platform-tests/wpt/issues/30863).

This proposal introduces a pair of WebDriver commands exposed to WPT as testdriver.js methods that directly place and clear spelling/grammar markers, thus making the marker dependent half of the feature family testable with ordinary reftests.

---

## Scope
This proposal limits scope to forced markers and does not cover actual checking of spelling and grammar. We recommend this for two reasons:

1. This would require installed dictionaries, OS spellcheck services, and accounting for asynchronous timing. All three present significant challenges in CI.
2. [HTML](https://html.spec.whatwg.org/multipage/interaction.html#spelling-and-grammar-checking) only requires that errors be indicated when checking is enabled, it leaves the timing and interface discretionary.

	> If the checking is enabled for a word/sentence/text, the user agent should indicate spelling and grammar errors ... This specification does not define the user interface for spelling and grammar checkers. A user agent could offer on-demand checking, could perform continuous checking while the checking is enabled, or could use other interfaces.


---

## Goals

* Make marker-dependent rendering behavior such as highlight pseudo-elements, the decoration values, and highlight overlay painting testable on release browsers in CI.
* Keep the automation surface minimal.
* Design with room for a future marker-readback command (see [Future Work](#future-work)) that can easily extend the shape rather than conflict with it.

## Non-Goals

* Testing the underlying spell checker dictionary, tokenization, etc.
* Exposing marker state to page content. Nothing here is exposed outside of automation.

---

## Proposed Approach

Two WebDriver commands, both surfaced in testdriver.js:

```js
// Create a marker of the specified type over the given range
await test_driver.set_text_marker(
  element,              // the container element
  "spelling",           // can be either "spelling" or "grammar"
  start,                // UTF-16 offsets into the element's rendered text
  end
);

// Remove all markers previously placed by set_text_marker in the top-level
// browsing context containing context
await test_driver.clear_text_markers(context);
```

With a marker forced, the rendering can be tested through an ordinary reftest. The test page places a marker and styles `::spelling-error` and the reference paints equivalently styled text. The existing related tests already have the reftest shape so adoption would require few test side changes.

**Note:** We are proposing element + character offsets rather than a DOM `Range` in order to avoid problems from WebDriver Classic's inability to serialize `Range` endpoints. Also, HTML counts values in form controls as checkable text but `Range` cannot address those values.

**Note:** Regarding marker lifecycle, the only guarantee needed is that a forced marker persists and affects rendering until `clear_text_markers` is called, provided the marked content is not modified. This should hold whether or not the platform's actual checking runs. Behavior when the marked text is mutated can be left to implementations. This would mean that tests that change marked text would be responsible for clearing and re-adding markers as needed.

---

## Alternatives Considered

### 1. Wait for real checking to complete

A synchronization command that resolves when checking has finished. The limitation with this approach is that nothing would guarantee that a checker runs and HTML leaves this as discretionary. 

### 2. Virtualize the checker input

We could install a fake dictionary and let the real pipeline produce markers. This would be excellent for spelling, but grammar checkers do not consume this input so half the feature family would stay untestable. Also, as per above since the pipeline between dictionary and marker is discretionary this added fidelity would not verify anything normative. The hope is that the design proposed here leaves the door open to this later.

### 3. Engine-internal hooks / vendor-specific testdriver

The hooks exist but are test-build-only. Also, [as noted in RFC 226](https://github.com/web-platform-tests/rfcs/blob/main/rfcs/tentative_testdriver_methods.md#alternatives-considered), vendor collaboration is known to be challenging in this department.

---
## Accessibility, Internationalization, Privacy & Security

**Privacy & security.** The commands are automation-only (a WebDriver
session is required) and they do not add any capability to page content. No read-back of marker state is proposed and page script continues to have no way to observe where markers are.

**Internationalization.** Forcing markers removes the dependence on system language and installed dictionaries entirely. Unlike the current tests, the forced marker tests will behave identically regardless of the machine's locale.

**Accessibility.** No direct impact.

---

## Relationship to Other Tools & APIs

- **[SpellCheckCustomDictionary](https://github.com/Igalia/explainers/tree/main/spell-check-dictionary)**:
	- Testing for this proposed feature will likely have some overlapping concerns. This is sketched under [Future Work](#future-work) and this proposal is designed not to conflict.
- **Engine internals**:
	- Referenced above in [the introduction](#introduction--motivation), Blink `internals.setMarker()`, WebKit `Internals` marker APIs are the in-engine precedents that this proposal makes reachable across engines.

---

## Process & Stakeholder Feedback

The underlying request and design grew out of [wpt#30863](https://github.com/web-platform-tests/wpt/issues/30863) and a [Chromium-tracker request for WPT infrastructure](https://issues.chromium.org/issues/40288147) for these features. Consensus is being sought from Chromium and WebKit under [RFC 226](https://github.com/web-platform-tests/rfcs/blob/main/rfcs/tentative_testdriver_methods.md), documented in wpt#30863 and this explainer. This document exists to aid in seeking consensus.

- **Chromium**: No position yet on this proposal.
- **WebKit**: ships the pseudo-elements and internal marker forcing. No position yet on this proposal.
- **Gecko**: ships the decoration values but not the pseudo-elements([mozilla/standards-positions#470](https://github.com/mozilla/standards-positions/issues/470) is open without a stated position). No position yet on this proposal.

*(This section will be updated as feedback arrives)*

---

## Future Work

- **Specification**: tentative testdriver methods first using RFC 226 with tests marked `.tentative` and methods that assert that status with this explainer as the statement of intent. The intended eventual home is HTML in the form of an extension command defined alongside 6.8.5 where the checkable text is enumerated.

- **Marker readback** (`get_text_markers` → `[{start, end, type}]`) would make the real checker decisions assertible with no rendering dependency. This could be the path to testing for `SpellCheckCustomDictionary`.
- **Mock dictionary** ([alternative 2](#alternatives-considered)): only if end-to-end real-pipeline coverage proves necessary.

---

## References & Acknowledgements


- The marker-forcing design proposed here was first offered by Delan Azabani in [wpt#30863](https://github.com/web-platform-tests/wpt/issues/30863).
- [CSS highlight pseudo-elements](https://drafts.csswg.org/css-pseudo-4/#highlight-pseudos)
- [CSS spelling/grammar decoration values](https://drafts.csswg.org/css-text-decor-4/#valdef-text-decoration-line-spelling-error)
- [HTML 6.8.5 spelling and grammar checking](https://html.spec.whatwg.org/multipage/interaction.html#spelling-and-grammar-checking)
- [wpt RFC 226 tentative testdriver methods](https://github.com/web-platform-tests/rfcs/blob/main/rfcs/tentative_testdriver_methods.md)
