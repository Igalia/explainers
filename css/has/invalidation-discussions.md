# `:has()` invalidation discussion status

## Common baseline for the discussion

### `:has()` prototyping status in chromium project

After the Chrome version 95, when enabled via the `enable-experimental-web-platform-features` flag, authors can use the `:has()` selector via the JavaScript APIs (`querySelector`, `querySelectorAll`, `closest`, `matches`).  This implementation places very few limits except some pseudos related with tree boundary crossing (`:host()`, `:host-context()`, `:slotted()`, `::part()`, ...).

In other words, we have `:has()` selector matching functionality in those APIs enabled for most cases except tree boundary crossing.

`:has()` matching via these APIs is done via tree-walk, and is `O(n)` operation where `n` is the number of descendant elements. When there are multiple subject elements that share same descendants (as would be the case in `:has(.foo)` for example), `:has()` matching can be `O(n^2)` because of the repetitive checking of descendants, even when it is already known to be true.

By using a cache that stores the `:has()` matching status, this can be improved, at least within a single lifecycle (a single JavaScript call, a single style recalculation lifecycle), so we still have the `O(n)` problem of `:has()` matching for every lifecycle.

### Next step: invalidation prototyping.

With the merged CLs, `:has()` containing rules (e.g. `.ancestor:has(.descendant) { background-color: green }`) are applied on the initial load, but not live, because `:has()` invalidation is not supported yet.

#### How do we think about the `:has()` invalidation?
To share the overview of `:has()` style invalidation, we will use following simplified case.

* Descendant toggles the class value `selected-item` when it clicked.
* Descendant and its ancestor have different style when the descendant has the class value `selected-item`.

For the above case, without ':has', we need to add additional class value to the ancestor, and synchronize the ancestor class value with the descendant class value by JavaScript.

```html
<style>
    .selected-item { font-weight: bold }                      /* rule1 */
    .ancestor.has-selected-item { background-color: yellow }  /* rule2 */
</style>
<div class='ancestor'>
    <div><div><div id=descendant>click</div></div></div>
</div>
<script>
descendant.addEventListener('click', function() {
    // Toggle #descendant class value.
    // This leads to style invalidation for the #descendant element
    // due to the rule1.
    this.classList.toggle('selected-item');

    // Get ancestor element
    ancestor = this.closest('.ancestor');
    
    // Toggle .ancestor class value
    // This leads to style invalidation for the .ancestor element
    // due to the rule2.
    ancestor.classList.toggle('has-selected-item');
});
</script>
```

Style invalidation perspective, the JavaScript logic for the ancestor element consists of two parts. One is finding the `.ancestor` element, and the other one is triggering style invalidation by updating class value of the element.

We can use `:has()` to remove the JavaScript code that finds the `.ancestor` element and triggers style invalidation on the element.

```html
<style>
    .selected-item { font-weight: bold }                        /* rule1 */
    .ancestor:has(.selected-item) { background-color: yellow }  /* rule2 */
</style>
<div class='ancestor'>
    <div><div><div id=descendant>click</div></div></div>
</div>
<script>
descendant.addEventListener('click', function() {
    // Toggle #descendant class value.
    // This leads to style invalidation for the #descendant element
    // due to the rule1.
    this.classList.toggle('checked');
    //
    // This also leads to upward traversal from #descendant element
    // to find .ancestor element due to the rule2.
    // 
    // And when it finds the .ancestor element, the element will be 
    // invalidated due to the rule2.
});
</script>
```

This means that, what ':has' style invalidation need to do are, 1. finding `.ancestor` element, 2. triggering style invalidation on the `.ancestor` element.

So, in this case, 
1. when browser engine detect a chage of adding or removing the class value `selected-item` on an element,<br>
(<code>.ancestor:has( <b style='background-color: yellow'>.selected-item</b>)) {...}</code>)
2. it will travers to ancestors of the changed element to find elements with the class value `ancestor`,<br>
(<code><b style='background-color: yellow'>.ancestor</b>:has(<b style='background-color: yellow; color: yellow'>&nbsp;</b>.selected-item) {...}</code>)
3. and trigger style invalidation of the ancestor element as if the `:has(.selected-item)` state was changed on the ancestor element.<br>
(<code>.ancestor<b style='background-color: yellow'>:has( .selected-item)</b> {...}</code>)

If we assume we have a virtual pseudo-class that represents true when there is a descendant element with a class value of `selected-item` (something like `:has-descendant-class-selected-item`), then we can read the last step as:

3. and trigger style invalidation of the ancestor element as if the `:has-descendant-class-selected-item` pseudo state is changed.<br>
(<code>.ancestor<b style='background-color: yellow'>:has-descendant-class-selected-item</b> {…}</code>)

We can say that these steps are : *"Finding elements that are possibly affected by a mutation, and creating virtual pseudo state mutation event on the elements to trigger style invalidation"*

Existing browser engine already has a functionality of invalidating style of an element when a pseudo state is changed on it. So, what `:has` style invalidation need to do is, *"to traverse upward to find possible elements affected by the `:has()` state, and trigger invalidation on the element"*.

The time complexity of the step2 (finding `.ancestor`) will be `O(m)` where `m` is the tree depth of the changed element - it will traverse all ancestors of the changed element to find elements with the class value `ancestor`. (Please note that this is different with the `:has()` selector matching complexity which is `O(n)` where `n` is the number of descendants)

#### What are the variations to consider in `:has()` invalidation?

We can generate infinite number of selector expressions by combining `:has()` with other selectors. Each of those introduces different types and amount of complexity and performance impact. Those also make it more difficult to discuss. Effectively, we need to discuss what might be necessary limitations on `:has()` style invalidation, and where things begin to get into uncomfortable levels of complexity and performance impact.

To get the possible limitations, it would be helpful to list all the variations to consider in `:has()` invalidation.

| Variation to consider   | Example |
| :----------- | :----- |
| `:has()` argument starts with `>` | `.hero:has(> img)` |
| `:has()` argument starts with descendant combinator | `.hero:has(img)` |
| attribute/elemental selectors in `:has()`  | `.hero:has(img)`<br>`.hero:has(.splash)`<br>`.hero:has([alt])`<br>`.hero:has(#main-feature)`<br> |
| compound selector in `:has()`  | `.product-card:has(.shirt.sale[active])` |
| selector list in `:has()`  | `.product-card:has(.shirt, .pants)` |
| `:has()` argument starts with `~` or `+` | `.hero:has(+ section)`<br>`.hero:has(~ section)` |
| complex selector in `:has()` | `.product:has(.recommended > .adapter)`<br>`section:has(figure.schematic figcaption)` |
| non-terminal `:has()` | `.product-card:has(.shirt.sale[active]) .button` |
| `:has()` in logical combinations | `:not(:has(foo))`<br>`:is(:has(foo), :has(bar))` |
| pseudo elements in `:has()` | `:has(::first-letter)` |
| logical combinations in `:has()` | `:has(:not(foo))`<br>`:has(:where(foo, bar))`<br>`:has(.a:has(.b))` |
| linguistic pseudo-classes in `:has()` | `:has(:dir(rtl))`<br>`:has(:lang(fr-be))` |
| location pseudo-classes in `:has()` | `:has(:any-link)`<br>`:has(:visited)`<br> `:has(:target)`<br>`:has(:target-within)`<br>...|
| user action pseudo-classes in `:has()` | `:has(:hover)`<br>`:has(:active)`<br>`:has(:focus)`<br>...|
| time-dimensional pseudo-classes in `:has()` | ... |
| resource state pseudos in `:has()` | ... |
| input pseudo-classess in `:has()` | ... |
| tree structural pseudos in `:has()` | ... |

By grouping these variations into allowing or disallowing group, we can get possible limitations.

#### What are the essential use cases that `:has()` invalidation should support?

Listing all the possible limitations and examining the complexity and performance impact of all limitations are too difficult and time consuming. Actually it looks impossible and inefficient to get all those and discuss with those.

Considering *"What are the essential use cases that `:has()` invalidation should support?"* will help us get the limitation to start with.

We have these three use cases from the previous discussions. (Shared by [Rune](https://twitter.com/runeli), originally from [Una](https://twitter.com/una)).

1. Interactions -- Hovering a button within a card makes the card style change (i.e. background color, border, or even interaction like having a shine animation gloss over it). Sure you can solve this when a single card has a single action, but what happens when that card has multiple actions? You need JS for that.
2. States -- Styling things like containers with certain states (i.e. "empty" or "pending") is either not consistent (:empty/:not:empty due to elements vs text nodes and whitespace), or not possible in CSS. Say you want an empty state experience and in your JS you populate an Inbox with a cute message that says "Yay you've reached Inbox 0!". You may want to style the page a certain way, detecting when the child class is present. I.e. if .empty-message is present, it's parent/ancestor .inbox-container could get a style, like a sunshine background. JS is currently required for that.
3. Pairings -- Say you have a shopping card. The shopping card has a "Buy" button. The buy button may be :disabled when the item is sold out. It would be nice to be able to style either the parent card or any parent element with the "Sold Out" style. JS is currently required for that. (I guess this is also a state example)

It looks that lots of `:has()` usages would be similar with these cases. (Styling parent or ancestor element by its descendant condition)

#### Given the use cases, what limitations would it make sense to start with?

All the three use cases above tries to style parent or ancestor element by the condition of its descendant element. So, allowing these variations would be enough for supporting those use cases.
* Allow `:has()` argument starts with `>`
* Allow `:has()` argument starts with descendant combinator
* Allow attribute/elemental selectors in `:has()`
* Allow compound selector in `:has()`

When we have any progress with the above limitations, we can extend it to the pseudo classes mentioned at the use cases (`:hover`, `:disabled`). So, using the pseudos in `:has()` will be limited for now.

For the start, we will discuss the `:has()` invalidation with these limitation.
* Disallow selector list in `:has()`
* Disallow `:has()` argument starts with `~` or `+`
* Disallow complex selector in `:has()`
* Disallow non-terminal `:has()`
* Disallow `:has()` in logical combinations
* Disallow all pseudos in `:has()`

Please note that, these limitations are not necessarily proposals for where we end up, it's just about how we simplify and grow the discussion.

These are roughly expected issues for allowing each variations.

| Variation | Issues |
| :----------------------- | :------------------------------ |
| selector list in `:has()` | Can be supported by small changes in feature extraction. |
| `:has()` argument starts with `~` or `+` | Previous sibling traversal step need to be added. |
| complex selector in `:has()` | Can be supported by small changes in feature extraction. |
| non-terminal `:has()` | Can be supported by some changes in feature extraction. |
| `:has()` in logical combinations | Can be supported by some changes in feature extraction. |
| pseudo elements in `:has()` | Not yet checked. |
| logical combinations in `:has()` | `:is()` and `:where()` may introduce many changes.<br>`:has()` and `:not` can be supported by some changes in feature extraction. |
| linguistic pseudo-classes in `:has()` | Not yet checked. |
| location pseudo-classes in `:has()` | Not yet fully checked.<br>Most may be supported by small changes in feature extraction.  |
| user action pseudo-classes in `:has()` | Not yet fully checked.<br>Most may be support by small changes in feature extraction.<br>Need additional filtering for `:hover` to prevent frequent upward traversal.  |
| time-dimensional pseudo-classes in `:has()` | Not yet checked. |
| resource state pseudos in `:has()` | Not yet checked. |
| input pseudo-classess in `:has()` | Not yet fully checked.<br>Most may be supported by small changes in feature extraction. |
| tree structural pseudos in `:has()` | Not yet fully checked.<br>Most may be supported by small changes in feature extraction. |
