# Explainer: Make a blob URL's origin opaque when the inner scheme is not http, https, or file

## Authors

* Byungwoo Lee \<blee@igalia.com>

## Introduction

The goal is to align Chrome with the URL standard, which specifies that a blob URL's origin is opaque when its inner URL uses a scheme other than `http`, `https`, or `file`, while preserving the existing exception for application-defined standard schemes such as `chrome-extension`.

* This document status: Active
* Spec reference: https://url.spec.whatwg.org/#origin

## Context

Based on the spec, the origin of a blob URL should be an opaque origin when the inner scheme is not `http`, `https`, or `file`.

```javascript
// This should be "https://example.com"
new URL('blob:https://example.com/foo-bar').origin

// This should be "null"
new URL('blob:ftp://example.com/foo-bar').origin
```

However, there are application-defined standard schemes (for example, `chrome-extension`) that are already in use and need to remain origin-preserving blob inner schemes, so that a blob URL keeps working within a same-origin constraint.

```javascript
// This is supposed to be "null" as per the spec, but should
// be "chrome-extension://foo-bar" in Chrome browser to allow
// blob working within a same extension origin constraint.
new URL('blob:chrome-extension://foo-bar').origin
```

We can find similar behavior in Firefox. The browser allows preserving the inner origin for its extension scheme.

```javascript
// This is supposed to be "null" as per the spec, but returns
// "moz-extension://foo-bar" in Firefox browser.
new URL('blob:moz-extension://foo-bar').origin
```

## Motivation

The behavior is already described in the spec, and Chrome fails relevant WPT tests while Firefox and Safari pass. (e.g. `blob:ftp`, `blob:ws`, and `blob:wss` cases in https://wpt.fyi/results/url/url-origin.any.html)

## Proposal

To follow the standard restriction while preserving the existing user-agent-specific exceptions, this feature introduces a conditional standard scheme registration.

To distinguish whether a standard scheme is an origin-preserving blob inner scheme or not, add a new scheme registry vector `blob_origin_preserving_schemes` and helper methods. By default, `http`, `https`, and `file` are registered as origin-preserving schemes.

```diff
# url/url_util.cc
+ std::vector<SchemeWithType> blob_origin_preserving_schemes = {
+       {kHttpsScheme, SCHEME_WITH_HOST_PORT_AND_USER_INFORMATION},
+       {kHttpScheme, SCHEME_WITH_HOST_PORT_AND_USER_INFORMATION},
+       {kFileScheme, SCHEME_WITH_HOST},
+ };

# url/url_util.h
+ bool IsBlobOriginPreservingScheme(std::optional<std::string_view> scheme);
+ bool IsBlobOriginPreservingScheme(std::optional<std::u16string_view> scheme);
```

And add a boolean parameter `blob_origin_preserving` to the `url::AddStandardScheme()` method with default value `true`, so the existing application-defined standard schemes (e.g. `chrome-extension`) keep the current behavior. (We can make an application-defined standard scheme non-origin-preserving later if needed)

```diff
# url/url_util.h
  void AddStandardScheme(std::string_view new_scheme,
-                        SchemeType scheme_type);
+                        SchemeType scheme_type,
+                        bool blob_origin_preserving = true);

# url/url_util.cc
  void AddStandardScheme(std::string_view new_scheme,
-                        SchemeType type) {
+                        SchemeType type,
+                        bool blob_origin_preserving) {
    DoAddSchemeWithType(new_scheme, type,
                        &GetSchemeRegistryWithoutLocking()->standard_schemes);
+   if (blob_origin_preserving) {
+     DoAddSchemeWithType(
+         new_scheme, type,
+         &GetSchemeRegistryWithoutLocking()->blob_origin_preserving_schemes);
+   }
  }
```

With the helper methods, we can apply the opaque origin rule in `url::Origin::Create()` and `blink::SecurityOrigin::ShouldTreatAsOpaqueOrigin()`.

## Risks

The behavior is already applied to other browsers and this fixes the interoperability gap. There will not be any regression as the approach keeps existing behavior for the application-defined standard schemes.

## Security and Privacy Considerations

This makes Chrome's behavior stricter for the affected cases (such as `blob:ftp://` or `blob:ws://`) since the origin of the blob URL becomes opaque, so it is no longer treated as same-origin with any other origin. This matches the URL standard and the behavior of other browsers.

## Testing

There are existing WPT tests:
- https://wpt.fyi/results/url/a-element-origin.html
- https://wpt.fyi/results/url/a-element-origin-xhtml.html
- https://wpt.fyi/results/url/url-origin.any.html

The conditional standard scheme registration logic can be tested by unittests.