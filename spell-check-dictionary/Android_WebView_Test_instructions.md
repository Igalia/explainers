# Android WebView Test Instructions

For Android WebView, we have a separate [WebView manual test](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/web_tests/wpt_internal/spell-check-custom-dictionary/add-remove-words-webview-manual.html).

This doc is mainly focused on testing with an emulator. The `adb` commands can be
run from anywhere; the `tools/`, `build/` and `out/` ones are relative to the
root of a Chromium checkout.

Last verified with all six steps PASS: WebView Dev 153.0.7993.0 as the provider
on the `android_34_google_apis_x64` emulator (Android 14, userdebug), with the
image's only spell checker, `com.google.android.inputmethod.latin`'s
`AndroidSpellCheckerService` (the Gboard preload, `LatinIMEGooglePrebuilt`
12.4.05).

## 1. Emulator

This test is run on an emulator. The image must be `userdebug` (chromium's AVDs
are) so command line flags can be applied, and it must be a `google_apis` image
so it ships a spell checker (step 2). Pick an ABI matching whichever WebView APK, e.g. `x64` here:

```sh
tools/android/avd/avd.py install \
    --avd-config tools/android/avd/proto/android_34_google_apis_x64.textpb
tools/android/avd/avd.py start \
    --avd-config tools/android/avd/proto/android_34_google_apis_x64.textpb \
    --emulator-window
```

## 2. Check the emulator's spell checker

A `google_apis` image ships the Gboard preload
(`/product/app/LatinIMEGooglePrebuilt`). Verify over adb rather than tapping through Settings:

```sh
adb shell dumpsys textservices | grep mId=
# -> com.google.android.inputmethod.latin/...AndroidSpellCheckerService
adb shell settings put secure spell_checker_enabled 1
```

`spell_checker_enabled` reads back `null` on a fresh image; setting it to `1` removes the doubt.

This service is the **only** spell checker registered on such an image, and it is
already selected, so there is normally nothing to configure.

Also avoid a low-RAM emulator image. Android disables spell checking entirely
there (`spellcheck::IsAndroidSpellCheckFeatureEnabled()` is
`!base::SysInfo::IsLowEndDevice()`), which makes `IsSpellCheckingEnabled()`
false.

## 3a. Shortcut: fetch a prebuilt WebView

No build is needed once the feature has reached a released channel. It is
available in WebView Dev as of 153.0.7993.0; more generally, a channel build
works if its version is at or past the `chrome/VERSION` of the checkout the
feature landed in. `x86_64.apk` below is simply the x86_64 split of the Dev
channel. Install it and select it as the provider:

```sh
adb install -r ~/Downloads/x86_64.apk   # WebView Dev, x86_64
adb shell cmd webviewupdate set-webview-implementation com.google.android.webview.dev
adb shell dumpsys webviewupdate | grep "Current WebView package"
```

The `.dev`, `.beta` and `.canary` package names are valid-but-empty provider
slots on a stock emulator image, so installing one just fills it. Check the
version that results from the `dumpsys` line above: the emulator's own
preinstalled WebView is usually years old and will not have the feature at all.

A WebView-based app is needed to browse with. The shell is pure dex (no
native libraries), so a prebuilt one runs on any ABI — take
`SystemWebViewShell.apk` from a `chrome-android` build archive rather than
building it:

```sh
adb install -r SystemWebViewShell.apk   # package: org.chromium.webview_shell
```

Going this route, use `org.chromium.webview_shell` as the package name in
steps 4 and 5.

## 3b. Build and install WebView plus the shell

You could build the webview with your checkout. Here are the steps suggested -

```sh
autoninja -C out/Android system_webview_apk system_webview_shell_apk
out/Android/bin/system_webview_apk install
out/Android/bin/system_webview_apk set-webview-provider
out/Android/bin/system_webview_shell_apk install
```

This needs a checkout synced for Android: `target_os = ["android"]` in
`.gclient` followed by `gclient sync`, otherwise `gn gen` fails with *"Missing
native Android toolchain support"*. On an emulator, also add
`system_webview_shell_package_name = "org.chromium.my_webview_shell"` to your GN
args, otherwise the preinstalled shell blocks installation with
`INSTALL_FAILED_UPDATE_INCOMPATIBLE`.

## 4. Turn the feature on

The API is `RuntimeEnabled=SpellCheckCustomDictionaryAPI` with status
*experimental*, so it is off unless enabled explicitly. WebView reads flags from
`/data/local/tmp/webview-command-line`:

```sh
build/android/adb_system_webview_command_line \
    --enable-blink-features=SpellCheckCustomDictionaryAPI
```

Then **force stop and restart** the shell, otherwise the flag is not picked up:
`adb shell am force-stop <shell package>` (`org.chromium.webview_shell` for a
prebuilt shell, `org.chromium.my_webview_shell` if you renamed it in 3b).

## 5. Serve the page over a secure context

The interface is `[SecureContext]`, and `file://` is not one, so opening the
page from disk leaves `document.spellCheckCustomDictionary` `undefined`. Serve
over loopback and forward the port:

```sh
python3 -m http.server 8000 \
    -d third_party/blink/web_tests/wpt_internal/spell-check-custom-dictionary
adb reverse tcp:8000 tcp:8000
adb shell am start -n org.chromium.webview_shell/.WebViewBrowserActivity \
    -a android.intent.action.VIEW \
    -d "http://localhost:8000/add-remove-words-webview-manual.html"
# With a locally built shell, this is the same as:
#   out/Android/bin/system_webview_shell_apk launch "<url>"
```

The page shows a banner at the top reporting whether the API is available and
whether the context is secure, so you can confirm steps 4 and 5 at a glance.

## Why WebView differs from desktop

* WebView disables spell checking by default and only checks elements carrying
  an explicit `spellcheck="true"` attribute
  (`android_webview/browser/aw_settings.cc`: `spellcheck_enabled_by_default =
  false`, for back-compat with existing apps — crbug.com/652314). Every editable
  in the page sets it explicitly, and Test 1 checks the opt-in itself.
* Android has no Hunspell dictionary in the renderer
  (`use_renderer_spellchecker` is false there). Spell checking goes to the
  platform checker — Android's `TextServicesManager` / `SpellCheckerSession`, via
  `components/spellcheck/browser/android/`.
* Because of that, every check is an asynchronous round trip through the browser
  process (`SpellCheckProvider::RequestTextCheckingFromBrowser`) and then out to
  another Android app, so squiggles appear and reappear with a visible delay that
  desktop Hunspell does not have.

The per-document dictionary itself lives in the renderer
(`SpellCheckProvider::document_custom_words_`) and filters results *after* they
come back from the platform checker, so the behaviour should match desktop even
though the misspellings are found by Android rather than by Hunspell. The tests
check that the filtering, the per-document scoping, and the caps all survive
that round trip.
