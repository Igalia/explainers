# Explainer: the `preparePrint()` interface


- Contents:
 - [Authors](#Authors)
 - [Introduction](#Introduction)
 - [Context](#Context)
 - [Proposal](#Proposal)
 - [Testing](#Testing)
 - [Risks](#Risks)
 - [Security and Privacy Considerations](#Security-and-Privacy-Considerations)


## Authors


* Cathie Chen \<cathiechen@igalia.com>


## Introduction


This feature's main goal is to provide web authors with a way to get notified when all the resources needed for printing are loaded.


* This document status: Active
* Expected venue:
 - [Printing](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html?utm_source=chatgpt.com#printing)


## Context


print.html
```html
<!DOCTYPE html>
<html>
<head>
<style>
@font-face {
   font-family: Avenir-Regular;
   src: url("./resource/Avenir-Regular.woff2") format("woff2");
}


@media print {
   body {
       font-family: Avenir-Regular;
   }
}
</style>
<script>
function triggerPrint() {
   window.print();
}
</script>
</head>
<body onClick="triggerPrint()">
   <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus vestibulum urna ac nibh pellentesque
       vestibulum.
   </p>
</body>
</html>
```


In the previous example, `body{ font-family: Avenir-Regular; }` is specific to the print mode. When a user tries to print the page, if the font `Avenir-Regular` has not loaded yet, the user agent would try to fetch it while printing.


If the print is initiated by JS `window.print()`, according to the definition of [printing steps](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#printing-steps):
> The user agent may wait for the user to either accept or decline before returning; if so, the user agent must pause while the method is waiting.


The user agent should be paused, which would delay loading the font resource until it is recovered. This could cause unexpected printing results, like blank text or text in a fallback font.


In Chromium, if the print is initiated by the user, it calls a function `willPrintSoon()` before the actual print. This function tries to change the media to print mode and loads all the resources needed for printing. It does not start to print until all the resources needed are loaded. Currently, in JS, there is not something like `willPrintSoon()` to load the print resources.


## Proposal


We propose to provide an interface, `Promise<undefined> preparePrint()`, which loads all the needed resources in print mode, and returns a promise. Solve the promise when all the resources are loaded. So it is easy to know when the page is ready to print.


To implement `Promise<undefined> preparePrint();`:


- When `preparePrint()` is called, if the current window is not attached, return an empty promise directly.
- If, currently, the previous calling of `preparePrint()` has not resolved yet, return an empty promise directly.
- Otherwise, call `WillPrintSoon()`.
  - If there is no resource needed to be loaded, return a resolved promise directly.
  - If there are some resources loading, create a `ScriptPromiseResolver`, and keep it on `LocalDOMWindow`, and return its promise. When the page is done loading, resolve this promise.


With "preparePrint" supported, it is easy to make a print as expected.
prepare-print.html
```html
<!DOCTYPE html>
<html>
<head>
<style>
@font-face {
   font-family: Avenir-Regular;
   src: url("./resource/Avenir-Regular.woff2") format("woff2");
}
@media print {
   body {
       font-family: Avenir-Regular;
   }
}
</style>
<script>
function triggerPrint() {
   window.preparePrint().then(() => {
       window.print();
   }).catch((error) => {
       console.error("Error preparing print:", error);
   });
}
</script>
</head>
<body onClick="triggerPrint()">
   <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus vestibulum urna ac nibh pellentesque
       vestibulum.
   </p>
</body>
</html>
```


## Testing
To test, we could use `performance` to check if the font is loaded or not.
The following code tests that `preparePrint()` will load an unloaded print font resource.


```
let t = async_test("preparePrint loads resources needed by print");
window.addEventListener("load",  t.step_func(function () {
   let print_font_loaded = false;
   let entries_before = performance.getEntriesByType('resource');
   for (let entry of entries_before) {
       if (entry.name.includes("Avenir-Regular.woff2")) {
           print_font_loaded = true;
           break;
       }
   }
   assert_false(print_font_loaded, "The print font is not loaded before preparePrint");


   window.preparePrint().then(
       t.step_func_done(function () {
       let entries_after = performance.getEntriesByType('resource');
       for (let entry of entries_after) {
           if (entry.name.includes("Avenir-Regular.woff2")) {
               print_font_loaded = true;
               break;
           }
       }
       assert_true(print_font_loaded, "The print font should be loaded after preparePrint");
       })
   ).catch((error) => {
       assert_true(false, "Error preparing print: " + error);
   });
}));
```


## Risks


### The definition of `willPrintSoon`
`willPrintSoon` is an existing function in Chromium. It seems WebKit and Gecko do not have functions similar yet.
In Chromium, `willPrintSoon` basically loads `LoadAllImagesAndBlockLoadEvent` and `InitiateStyleOrLayoutDependentLoadForPrint` which switch the media type and viewport size, `UpdateStyleAndLayout`, then load the resources solved by style.


### `display:none` iframe print
There is a case, a `display:none` iframe, if it calls:
```
window.preparePrint().then(() => {
       window.print();
   });
```
Ideally, `preparePrint()` should block the effect from the owner element, update the layout tree and style, then load the resources. But currently, in `willPrintSoon`, the layout tree seems not to be updated.


## Security and Privacy Considerations
This feature does not reveal extra sensitive information. And there is no data kept across browsing sessions.

