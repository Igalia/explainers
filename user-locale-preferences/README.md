## Table of Contents

- [Explainer: Locale Extensions](#explainer-locale-extensions)
  - [Table of Contents](#table-of-contents)
  - [Authors](#authors)
  - [Participate](#participate)
  - [Motivation](#motivation)
  - [Overview](#overview)
  - [Summary of Proposed Supported Locale Extension Combinations](#summary-of-proposed-supported-locale-extension-combinations)
  - [Fingerprinting and Internationalization](#fingerprinting-and-internationalization)
    - [Fingerprinting Mitigation](#fingerprinting-mitigation)
    - [Overview of Mitigation Strategies](#overview-of-mitigation-strategies)
  - [Supported Tags Group #1:  Preferred first day of week, preferred clock, preferred temperature measurement unit](#supported-tags-group-1-preferred-first-day-of-week-preferred-clock-preferred-temperature-measurement-unit)
    - [Commonly Used Locale Defaults](#commonly-used-locale-defaults)
    - [Example: People who have traveled from one region to another](#example-people-who-have-traveled-from-one-region-to-another)
      - [Revealed Information as Conditioned on Browser Localization](#revealed-information-as-conditioned-on-browser-localization)
    - [Example: People with preferences that differ from all commonly used locale defaults](#example-people-with-preferences-that-differ-from-all-commonly-used-locale-defaults)
  - [Supported Tags Group #2: Numbering system and calendar](#supported-tags-group-2-numbering-system-and-calendar)
    - [Preferred Numbering System](#preferred-numbering-system)
    - [Preferred Calendar](#preferred-calendar)
  - [Avoiding Prioritization of Larger Linguistic Communities](#avoiding-prioritization-of-larger-linguistic-communities)
    - [Considering Content Locales](#considering-content-locale)
    - [Options Reduction](#options-reduction)
  - [Mechanisms](#mechanisms)
    - [Agent-Driven Negotiation: JavaScript API](#agent-driven-negotiation-javascript-api)
      - [IDL](#idl)
      - [Proposed Syntax](#proposed-syntax)
    - [Proactive Content Negotiation with Client Hints](#proactive-content-negotiation-with-client-hints) 
      - [`Client Hint` Header Fields](#client-hint-header-fields)
      - [Usage Example](#usage-example)
  - [Final Notes on Security and Privacy](#final-notes-on-security-and-privacy)
  - [FAQ](#faq)

## Authors:

- [Ben Allen](https://github.com/ben-allen)

## Participate

- [GitHub repository](https://github.com/ben-allen/locale-extensions)
- [Issue tracker](https://github.com/ben-allen/locale-extensions/issues)

Please post feedback on the issue tracker above or via email to Ben Allen or Shane Carr.



## Motivation

On the Web platform, content localization is dependent only upon a user's language or region. This behavior can result in annoyance, frustration, offense, or even unintelligibility for some users. This proposal addresses common situations where users prefer locale-related tailorings that differ from the locale defaults. Consider the following issues:

1. People who have moved to the United States often prefer temperatures on weather sites be displayed in Celsius rather than Fahrenheit.
2. In some locales multiple numbering systems are in common use. Users seeking content in these locales may find one or the other of these numbering systems not immediately intelligible, and therefore need a way to request content they can read.
3. An English-speaking user from Japan receives non-localized content in 'en-US'. They can read English, but nevertheless prefer seeing a 24-hour clock and calendars that have Monday, rather than Sunday, as the first day of the week.
4. More generally: 'en-US' is currently the typical untranslated language for software, even though 'en-US' has region-specific formatting patterns that differ from those used globally. As a result, often text with untranslated UI strings will be displayed in a language accessible to all users who speak English, but with temperatures and times represented in globally uncommon scales.
5. Users who have emigrated from one country to another may want to set their language dialect to one they can understand, but prefer that dates, times, and numbers be rendered according to local standards.

In the native environment these problems are easily solved, since users can specify their preferences in their system settings. However, offering the full amount of flexibility that the native environment allows is not possible in the often hostile Web environment. This is because when a user's preferences as specified in their OS settings are uncommon, or even just very detailed, revealing them can result in privacy loss. 

This proposal defines a mechanism for web clients to read user preferences from their operating system and then relay a safe subset of those preferences to servers, while refraining from sending combinations of preferences that are likely to substantially individuate the user. We aim to allow for significantly more complete &mdash; but not necessarily perfect &mdash; localization that respects user preferences insofar as possible while only exposing relatively low-surprisal information about users.

## Overview 

Unicode Extensions for BCP 47 can be used to append additional information needed to identify locales to the end of language identifiers. Enabling limited support for a carefully selected subset of BCP tags can help solve problems like the ones above.

The proposal includes two mechanisms for conveying OS settings to servers:

For **client-side applications**, [a browser API](#agent-driven-negotiation-javascript-api) that fetches this information from the different platform-specific APIs. 

For **server-side applications**, [a set of `Client Hints` request header fields](#proactive-content-negotiation-with-client-hints). Servers indicate the specific proactive content negotiation headers they accept in the `Accept-CH` response header.

The proposed API and `Client Hints` infrastructure are straightforward: the API provides methods for accessing each individual preference separately, and the `Client Hints` headers also provide a means to request each individual preference separately. There is no provided way in either mechanism to request all preferences at once &mdash; each preference must be explicitly requested. Although this proposal discusses prefered localization tailorings in terms of Unicode Extensions for BCP 47, there is no way for servers to request the entire extension string at once.

We propose supporting commonly used combinations of the following customization options. The list is given in rough order of priority, with numbering system being the highest priority customization and preferred first day of week the lowest.

1. Preferred numbering system (Devanāgari, Bengali, Eastern Arabic, etc.). This option corresponds to the `nu` Unicode Extensions for BCP 47 tag.
2. Preferred hour cycle (12-hour clock or 24-hour clock). This option corresponds to the `hc` tag
3. Preferred temperature measurement unit (Celsius or Fahrenheit). This option corresponds to the `mu` tag.
4. Preferred calendar (Gregorian, Islamic, Buddhist Solar, etc.). This option corresponds to the `ca` tag.
5. Preferred first day of week for calendars. This option corresponds to the `fw` tag

As stated previously, both of the [mechanisms](#mechanisms) for conveying locale preferences to servers are straightforward.  Most of the complexity involved in actualizing this proposal pertains to determining in advance what combinations of preferences can be safely exposed to servers without impacting user privacy. 

In its current state, this proposal features a number of back-of-the-envelope estimations made using uncertain or incomplete data, and the frequent use of vague terms like "likely" and "unlikely". Replacing these placeholder terms with clear normative statements will require user research data, and ideally will require on-the-ground knowledge of each supported language and region. 

User research data will also be necessary to determine whether all five of these customization options can be made available, or if in some cases one or more must be dropped.

This proposal discusses the five tags above in two groups:

* `fw`, `hc`, and `mu` (first day of week, clock, temperature measurement unit). These tags makes sense to discuss in one group because the number of valid settings for each of them is naturally limited.
* `ca` and `nu` (calendar, numbering system). A large number of options are available for these tags, but in most locales settings other than the default is dangerous. The `nu` option is particularly important, but also presents a delicate problem: in many contexts, using it at all would result in the user becoming immediately distinguishable from all other users, but in some contexts failing to provide it potentially results in a large number of users receiving unintelligible content.

## Summary of proposed supported locale extension combinations


Our goal is to whenever possible offer users to request the following types of content tailorings:

* Any combination of values for the five locale extension tags listed above that matches the default settings in the locale (or locales) sent in the client's `Accept-Language` header.
* Any combination of values for the five locale extension tags that is otherwise commonly used in the locale (or locales) sent in the client's `Accept-Language` header.
* Any combination of values which bears little surprisal when considered in combination with other locale-related information about the user that the server already knows.
* Values for the `nu` tag that, if not honored, would result in users receiving unintelligible content.

A top priority is allowing users to specify alternate numbering systems in languages where multiple commonly used numbering systems exist. Another key priority is ensuring that whatever level of flexibility is extended to users of commonly spoken languages is also extended to users from smaller cultural/linguistic communities. 

## Fingerprinting and internationalization 

The standard practice in explainers is to put a section on security and privacy toward the end. In this explainer we have moved it up to nearly the start. This is because the benefits of allowing users to receive content tailored to their actual preferences are relatively self-apparent, particularly in contexts where failing to honor those preferences could result in users receiving content that is confusing or unintelligible to them.  What makes this proposal difficult is the threat of fingerprinting. A naïve approach to exposing user preference data can very easily result in a very large number of users unknowingly reducing the entropy of their identity to zero.

Fingerprinting allows sites to track users without their knowledge or consent, thereby meaningfully violating user privacy, and mitigating fingerprinting risk is our top concern.  Data gathered by the Electronic Frontier Foundation (EFF) for Peter Eckersley's 2010 paper [How Unique is your Browser?](https://coveryourtracks.eff.org/static/browser-uniqueness.pdf) estimated that 83.6% of browsers visiting the EFF's "Panopticlick" site bore a unique fingerprint. Some improvements have been made in the intervening years. Notably, the end of Adobe Flash and Java applets as Web technologies has foreclosed a number of potential fingerprinting attacks, and substantial measures have been taken to mitigate the risk of font-based fingerprinting.  Nevertheless, browsers today are nearly as fingerprintable as browsers in 2010 were. The process of reducing the potential for fingerprinting on the Web platform is necessarily a long and slow one  &mdash; a process measured in decades rather than years &mdash; involving the gradual replacement of technologies that expose more user information with technologies that expose less.

Fingerprinting is a particularly diabolical problem in the context of internationalization. The most straightforward way to prevent fingerprinting is to either send less information, or to make it impossible to send rare combinations of settings. However, equitable internationalization requires providing access to content in less commonly used locales, with this content appropriately tailored for all communities of users regardless of the size of that community -- which is to say, it requires accommodating many types of rare request.

To further complicate the problem, there can be security implications even when the number of bits of information revealed through requesting properly localized content is relatively low. This is because the information we reveal could give strong indicators of the identity categories the user falls into, even when the overall entropy reduction is not sufficient for trackers to fully individuate the user, and because the information we reveal is specifically about the user rather than their device, and so can be used for cross-device tracking.

### Fingerprinting mitigation

The [Mitigating Browser Fingerprinting in Web Specifications](https://www.w3.org/TR/fingerprinting-guidance/#detectability) WICG Interest Group Note, the best practices from which were used as a primary framework in the design of this proposal, observes that there exists no plausible way to eliminate fingerprinting. We can at most *mitigate* fingerprinting, either by reducing the available surface for fingerprinting by revealing less identifying information, or by ensuring that whatever fingerprinting occurs is in some way observable ("active fingerprinting") instead of invisible to the user ("passive fingerprinting").  By ensuring that the only fingerprinting opportunities made available require action taken by the server, it becomes more possible to control fingerprinting through regulatory means. It is worth noting that use of browser fingerprints to track users without permission is [only questionably legal in the European Union](https://www.eff.org/deeplinks/2018/06/gdpr-and-browser-fingerprinting-how-it-changes-game-sneakiest-web-trackers).

_Mitigating Browser Fingerprinting_ makes clear that fingerprint mitigation requires minimizing the fingerprinting surface even when the information that could be gathered is already exposed by other parts of the Web platform. This is, among other reasons, because the Web platform is not static: if the same pieces of identity-related information are exposed via two means, it becomes harder to remove the fingerprinting surface in the future, since it will require removing the attack surface from two different places at once. This spec aims to adhere to this guideline as closely as possible.

### Overview of mitigation strategies

Our strategies for mitigating fingerprinting risk are as follows:

* Ensuring that the only fingerprinting surfaces we reveal are active fingerprinting surfaces
* Only revealing settings when the surprisal of that information is relatively low when conditioned on already-revealed locale-related information.

In the current version of this proposal the pieces of already-revealed locale related information we consider are:

* The locale or locales revealed through the `Accept-Language` header and through `navigator.languages`
* The locale of the retrieved content itself.

The specific pieces of conditioning information used in this proposal are not to be understood as a definitive list of factors to consider when determining the safety of revealing user preferences, but are to be taken as an illustrative example. Should a version of this proposal be adopted, the already-revealed information ultimately used to determine whether a given setting is safe to transmit must take into account the extant realities of content localization on the Web rather than simply treating `Accept-Language` and `navigator.languages` in isolation.

Calculating the entropy lost through exposing content tailoring preferences is not straightforward, as the distribution of preferences is highly unequal, and is statistically dependent on other locale-related information about the user. As such, determining the specific combinations of valid options will require extensive user research data, as will determining which pieces of already-known information are most salient for determining conditional entropy. 

## Supported tags group 1: Preferred first day of week, preferred clock, preferred temperature measurement unit.

The Unicode Locale Extension tags `fw`, `hc`, and `mu` can be used to request a preferred first day of week, hour cycle, and temperature measurement unit. These three tags are useful to consider together. This is because there is a limited set of commonly used options for each of these tags: 

* No locale has as its default clock anything but `h12` (hours from 1 to 12) or `h23` (hours from 0 to 23). 
* No locale defaults to anything but `celsius` or `fahrenhe` for `mu`. 
* No locale defaults to anything but `mon`, `fri`, `sat`, or `sun` as its first day, with only one region (the Maldives) defaulting to `fri`. 

As such, for most users their combination of preferred settings for these three options will be shared with hundreds of millions or even billions of other people.


### Commonly used locale defaults

CLDR's supplemental data provides information on the default settings for these options for each region, alongside information on the population of the region, the languages spoken in the region, and the literary rate of the region. To get a *very* rough estimate &mdash; any real estimate would require user research &mdash; of the number of people in the world who would have the same settings for `fw`, `hc`, and `mu`, we've multiplied the population of each region by the literacy rate of that region, and summed the literate populations of the regions which by default use those settings.  

| extension string             | population | # locales using |
|------------------------------|------------|-----------------|
| -u-fw-mon-hc-h23-mu-celsius  | 2,714,937,996 | 674             |
| -u-fw-sun-hc-h12-mu-celsius  | 1,665,105,458 | 277             |
| -u-fw-sun-hc-h23-mu-celsius  | 917,309,644  | 199             |
| -u-fw-sun-hc-h12-mu-fahrenhe | 332,515,201  | 26              |
| -u-fw-mon-hc-h12-mu-celsius  | 315,642,460  | 173             |
| -u-fw-sat-hc-h12-mu-celsius  | 224,538,941  | 53              |
| -u-fw-sat-hc-h23-mu-celsius  | 82,481,712   | 30              |
| -u-fw-fri-hc-h23-mu-celsius  | 385,633     | 2               |
| -u-fw-sun-hc-h23-mu-fahrenhe | 307,290     | 2               |
| -u-fw-mon-hc-h12-mu-fahrenhe | 81,212      | 3               |

The three strings that rarely appear in region defaults reflect, in order, the default preferences in the Maldives, the default preferences in Belize, and the default preferences in both the Cayman Islands and Palau. All of the regions other than the United States that are listed as using a string indicating a preference for the Fahrenheit scale only use Fahrenheit for referring to weather.

Although the likelihood of a user's browser locale defaults matching one or another of the particular strings is not equal, the total entropy lost through revealing one of these strings is relatively low. Provided we disallow use of the three rare strings at the bottom of the table, we find that this distribution has 2.18 bits of entropy, only a little bit below the 2.58 bits of entropy obtained through rolling a balanced six-sided die. Exposing the preference string you've selected appears relatively safe &mdash; but only when taken in isolation, since the likelihood of selecting a particular preference string is statistically dependent upon other pieces of already-known locale-related information.

### Example: People who have traveled from one region to another

Consider the case of a student from the Netherlands who is spending a year at a university in Chicago. This student could avoid annoyance (and possibly error) if the university's course catalog displayed times on a 24 hour cycle instead of using the 12 hour clock common in the United States, and for the same reason would likewise prefer if calendars were displayed with Monday, rather than Sunday, as the first day of the week. Additionally, they are not acclimated to the region's extreme winters, and sometimes use the weather display on a local news site to help determine how many layers of clothes to wear. They would very much like to avoid the frustration and potential for mishap involved in converting temperatures from the unfamiliar Fahrenheit scale to the immediately comprehensible Celsius scale. 

Native applications can directly read the OS settings for preferred clock, first day of week, and temperature measurement system. However, it is not safe to directly expose this information to potentially hostile Web servers, since if our user's settings were idiosyncratic those idiosyncratic settings could easily be used to track them. It's safe to set your OS to display temperatures in Kelvin, but dangerous to tell arbitrary Web servers about it. 

The student's preferences can be expressed by the locale extension string `-u-fw-mon-hc-h23-mu-celsius`. Revealing this low-suprisal set of preferences would not by itself dramatically reduce the size of the student's anonymity set. However, we cannot consider the raw number of people expected to have this set of preferences in isolation, because the surprisal of a particular setting conditioned on other known pieces of information about the user can be quite high.

#### Revealed information as conditioned on browser localization

Fingerprinting servers necessarily know other pieces of locale-related information. Most obviously, servers know the contents of the `Accept-Language` header, and can also get equivalent information by consulting `navigator.languages`. For the sake of simplicity, we will refer to the requested locale or locales made available via these two routes as the "browser locale." 

The student in the example above's browser locale will almost certainly reflect either where they're from (in this case, 'nl') or where they're visiting (in this case, 'en-US'). 

1. If the student's browser locale is 'nl', the server can already determine that they most likely prefer `-u-fw-mon-hc-h23-mu-celsius` by inspecting the `Accept-Language` header. Because of the strong correlation between a user's settings and the locale the browser sends, the surprisal of this set of preferences is low. 

2. If the student's browser locale is 'en-US', revealing this preference string will likewise leave them with a relatively large anonymity set &mdash; most people from the regions that use those preferences by default will have left their defaults unchanged, and it is to be expected that there will be other people in the same situation as our student: requesting 'en-US' with OS settings matching the defaults for the hundreds of locales that default to `-u-fw-mon-hc-h23-mu-celsius`.

Determining the number of bits of information revealed in the second of the above scenarios will require user research. If about 5% of users of browsers localized to 'en-US' prefer `-u-fw-mon-hc-h23-mu-celsius`, either because they are, like our student, visiting the United States, or because for whatever reason they simply decided to download a browser version localized to 'en-US', our student has lost around 4.32 bits of entropy by revealing that preference. This is a significant amount of lost entropy.

Note, though, that we have reason to feel somewhat optimistic about *the specific case* of 'en-US', since a large number of people not from the U.S. use browsers localized to 'en-US'. It is possible that sufficient users worldwide fall into this category that it is safe for browsers localized to 'en-US' to reveal relatively more information than other browsers.


### Example: People with preferences that differ from *all* commonly used locale defaults

Every commonly used combination of `fw` and `hc` can be used in combination with the value `celsius` for `mu`. However, since the only sizable locale that defaults to `fahrenhe` is 'en-US', combinations of preferences involving `fahrenhe` that otherwise differ from the 'en-US' defaults are not guaranteed to be commonly used. Nevertheless, there are a number of people likely to use a browser locale of 'en-US' with preferences that differ from the United States defaults:

* People working with organizations that use a 24 hour clock.
* People with social, familial, and cultural ties to regions that use Saturday as the first day of the workweek.
* People who for reasons of simple personal preference like their calendar to have the first day of the workweek at the left-hand side of their calendars.
* People not from or in the United States who are nevertheless using 'en-US' as their browser locale.

Because of the large number and wide range of people using 'en-US' as their browser locale, it may be safe to offer most of these combinations of preferences despite them not being commonly used locale defaults. User research will be required. 

## Supported tags group #2: Numbering system and calendar 

The three tags discussed above naturally provide a limited number of options. There are only seven combinations of `fw`, `hc,` and `mu` that are commonly used as region defaults: the six combinations of options with `mu-celsius`, plus the region defaults for the United States. The tags `ca` and `nu` are different, because there are potentially a large number of settings for each of these tags, with most of those settings making the user immediately individuatable. 

### Preferred Numbering System

CLDR supports nearly 100 different numbering systems. However, almost all of these options only make sense in a few locales. 

We propose to restrict the number of available options for the `nu` tag to the following options:

* The default for the browser locale
* `latn` (Western Arabic), if the default is not `latn`.
* The numbering system designated as `native`, but only if that numbering system is actually in common use in that locale.

In certain regions, most notably the regions in which both Western Arabic and Eastern Arabic numerals are in common use, failing to support both of those numbering systems results in the delivery of content that is unintelligible to some users. Not being able to express a desire for a particular numbering system causes precisely the same problems that would be caused if users in locales where multiple scripts for text weren't able to select a script that's legible to them. In these cases, supporting the `nu` tag is a top priority &mdash; as much of a priority as the language tag itself &mdash; even if supporting that tag means not supporting any of the other locale preferences tags. 

See the section _Avoiding Prioritizing Larger Linguistic Communities_ for strategies on ensuring that the `nu` tag be made safely available.

### Preferred calendar

Nearly all regions use the Gregorian calendar, which is expressed as a locale extension tag as `ca-gregory`. It is likely safe in all regions to explicitly request `ca-gregory`, since the Gregorian calendar is in common use even in regions with other official civic calendars.

It is safe for users to send requests for non-Gregorian calendars when the specific calendar requested is either the default for the user's locale or a commonly used alternate in that locale, since the surprisal of that information is relatively low.  However, requesting a non-Gregorian calendar outside of those cases would likely serve to immediately reduce the entropy of the user's identity to 0. 

Once again, user research will be required to determine which alternate calendar preferences are safe to express in each locale. 

## Avoiding prioritization of larger linguistic communities

Preserving the size of the user's anonymity set necessarily requires ensuring that they can't send rarely used combinations of preferences. However, internationalization requires respecting the needs of users even (or especially) when they're from relatively small cultural or linguistic communities. An approach that treats the combination of the user's browser localization and user preferences as the only factors determining which preferences are safe to send necessarily gives more options to people from very large linguistic and cultural communities, since those users can lose relatively large amounts of entropy while still maintaining a viable anonymity set. 

As such, if the only revealed pieces of information we consider are the browser locale and the set of preferences sent, then we are forced to either offer very few options to all users, or else offer fewer options to users requesting content in anything but the most commonly used locales. Given the choice between those two options, we are obligated to choose the first, as prioritizing the needs of the largest communities over the needs of smaller communities runs directly against the spirit of internationalization.  

There may, however, be strategies that allow us to offer a robust range of preferences to all users, regardless of the size of their linguistic community, by looking for other pieces of locale-related information that share statistical dependencies with user preferences.

Content locale, discussed below, is to be understood as a potential example of this type of already-known information &mdash; and maybe not a particularly good one. User preference settings are potentially statistically dependent on a swath of other pieces of locale-related information, and user research will be required to find the already-exposed information that's most fruitfully used as a condition for exposing user preference data.

### Considering content locale 

In addition to the information provided in the user's `Accept-Language` header, the server also necessarily knows additional pieces of locale-related information. For example, the server knows the locale of the content it is serving. This correlates strongly with the browser locale &mdash; if someone is receiving content in 'nl', it's very likely that their `Accept-Language` contains 'nl'. If a user's browser locale matches the content's locale, it may be possible for users to maintain a reasonably large anonymity set even if their settings are relatively uncommon, due to having an initially large anonymity set.

One potential site for further user research is determining what other combinations of browser locale and non-default user preferences are common enough to allow when receiving specific content locales. This situation could arise when, for example, the region given in the browser locale has close cultural ties to the region in the content's locale, perhaps because of a shared language, because of economic ties, or because there exist diasporic communities from one of the regions in the other.

There are a number of difficulties involved in taking content locale into consideration. When using the `Client Hints` architecture, steps would have to be taken to ensure that the content's locale is known to the browser before the browser can safely reveal preference information.

### Options reduction

Reducing the number of options available across locales is a possible way to ensure that users of minority languages can express some preferences without necessarily exposing themselves to additional privacy loss. The removal of `fw` from the proposal, as previously mentioned, is one possibility. An additional possibility is limiting use of the `mu` tag &mdash; for example, allowing users to request the common `mu-celsius` setting, but not the rare `mu-fahrenhe` one. This would reduce the total information exposed, while still honoring the preferences of a wide range of users.

## Mechanisms for expressing locale preferences

The practicalities of implementation for this proposal are relatively straightforward, once the set of safe combinations of settings has been determined.

### Agent-driven negotiation: JavaScript API 

We expose the preferred options for these extensions in a JavaScript API via `navigator.locales` or by creating a new `navigator.localeExtensions` property. Note that the API does not expose what locale extension string was selected, and requests for preferences must be made one-by-one. This constraint is in place as an additional fingerprinting mitigation measure &mdash; if scripts were allowed to fetch all preferences at once, it would be more difficult to detect active fingerprinting attempts. By requiring options be requested one-by-one, sites that (for example) ask for an alternate numbering system when delivering content in a locale for which there is no commonly used alternate numbering system would be immediately identifiable as bad actors.

We expose the preferred options for these extensions in a JavaScript API via 'navigator.locales' or by creating a new 'navigator.localeExtensions' property: 

Browsers carry out the following steps the first time they request content in a specific locale:

1. The browser reads OS settings.
2. The browser compares these settings to the list of available locale extension strings, determines (by whatever means) which most closely resembles the user's preferences, and discards all other settings. 
3. Scripts can then request the retained settings, but only one-by-one. 

### IDL

```
interface LocaleExtensions localeExtensions {
  readonly attribute DOMString calendar;
  readonly attribute DOMString firstDayOfWeek;
  readonly attribute DOMString hourCycle;
  readonly attribute DOMString temperatureUnit;
  readonly attribute DOMString numberingSystem;
};

interface mixin NavigatorLocaleExtensions {
  readonly attribute LocaleExtensions localeExtensions;
};

Navigator includes NavigatorLocaleExtensions;
WorkerNavigator includes NavigatorLocaleExtensions;
```

### Proposed Syntax

```js

navigator.localeExtensions['numberingSystem'];
navigator.localeExtensions.numberingSystem;
self.navigator.numberingSystem;
// "deva"

navigator.localeExtensions['hourCycle'];
navigator.localeExtensions.hourCycle;
self.navigator.hourCycle;
// "h23"


```

## Proactive Content Negotiation With `Client Hints` ##

An <a href="https://datatracker.ietf.org/doc/rfc8942/">HTTP Client Hint</a> is a request header field that is sent by HTTP clients and used by servers to optimize content served to those clients. The `Client Hints` infrastructure defines an `Accept-CH` response header that servers can use to advertise their use of specific request headers for proactive content negotiation. This opt-in mechanism enables clients to send content adaptation data selectively, instead of appending all such data to every outgoing request.

Because servers must specify the set of headers they are interested in receiving, the `Client Hint` mechanism eliminates many of the opportunities for hostile passive fingerprinting that arise when using other means for proactive content negotiation (for example, the `User-Agent` string). 

Each supported extension gets its own `Client Hint`, which ensures that servers must advertise which locale-related preferences they request. This is analogous to the strategy used in the JavaScript API. Much like the API only allows requests for one preference at a time, thereby making it visible when a script attempts to access irrelevant preferences as part of a fingerprinting attempt, `Client Hint`s as used here ensure that servers that ask for irrelevant locale-related preferences are forced to be obvious about it.

### `Client Hint` Header Fields

Servers cannot passively receive information about locale extension-related settings. Servers instead announce their ability to use extensions, allowing clients the option to respond with their preferred content tailorings.

To accomplish this, browsers should introduce new `Client Hint` header fields as part of a structured header as defined in <a href="https://tools.ietf.org/html/draft-ietf-httpbis-header-structure-19">Structured Field Values for HTTP</a>.

<table>
  <tr><td><dfn export>`Sec-CH-Locale-Extensions-Calendar`</dfn><td>`Sec-CH-Locale-Extensions-Calendar`  : "gregory"</tr>
  <tr><td><dfn export>`Sec-CH-Locale-Extensions-FirstDay`</dfn><td>`Sec-CH-Locale-Extensions-FirstDay`  : "mon"</tr>
  <tr><td><dfn export>`Sec-CH-Locale-Extensions-HourCycle`</dfn><td>`Sec-CH-Locale-Extensions-HourCycle`  : "h23"</tr>
  <tr><td><dfn export>`Sec-CH-Locale-Extensions-MeasurementUnit`</dfn><td>`Sec-CH-Locale-Extensions-MeasurementUnit` : "fahrenhe"</tr>
  <tr><td><dfn export>`Sec-CH-Locale-Extensions-NumberingSystem`</dfn><td>`Sec-CH-Locale-Extensions-NumberingSystem`  : "deva"</tr>

  <thead><tr><th style=text:align left>Client Hint<th>Example output</thead>
</table>

The `Sec-` prefix used on these headers prevents scripts and other application content from setting them in user agents, and demarcates them as browser-controlled client hints so that they can be documented and included in requests without triggering CORS preflights. See [HTTP Client Hints Section 4.2, Deployment and Security Risks](https://datatracker.ietf.org/doc/html/rfc8942#section-4.2) for more information.

Designing the `Client Hints` header fields requires a tradeoff between fingerprinting mitigation and using a parsimonious set of headers. The approach that best prevents fingerprinting is to give each separate tag its own `Client Hint` header. Since servers must advertise their use of each header, fully separating the tags makes fingerprinting attempts more obvious &mdash;  a server that requests a large number of `Client Hints` without need is broadcasting its potential intent to use the extra information gathered from the client for fingerprinting. However, if header bloat becomes a primary concern, some of these headers can be grouped. For example, `hc`, `fw` and `ca` could be grouped together as preferences related to date and time, or `fw`, `hc`, and `mu` could be grouped due not to conceptual similarity but instead to how they are strongly correlated with each other, since users following United States regional standards are likely to want `-u-fw-sun-hc-h12-mu-fahrenhe`, while users in much of the rest of the world are likely to want `-u-fw-mon-hc-h23-mu-celsius`. 

Should the ability to customize settings beyond those expressible through BCP 47 tags become incorporated into this proposal, grouping will necessarily become a more pressing concern. For example, should additional preferences related to number formatting become part of the proposal, these could be grouped together with `nu`. 


### Usage Example

<div class=example>

1. The client makes an initial request to the server:

```http
GET / HTTP/1.1
Host: example.com
```

2. The server responds, sending along with the initial response an `Accept-CH` header (see [HTTP Client Hints Section 3.1, The `Accept-CH` Response Header Field](https://datatracker.ietf.org/doc/html/rfc8942#section-3.1)) with `Sec-CH-Locale-Extensions-NumberingSystem`. This response indicates that the server accepts that particular `Client Hint` and no others.

```http
HTTP/1.1 200 OK
Content-Type: text/html
Accept-CH: Sec-CH-Locale-Extensions-NumberingSystem
```

3. If the user's preferred numbering system differs from the defaults for the locale &mdash; in this case, the user prefers Devanāgarī numerals &mdash; subsequent requests to https://example.com will include the following request headers.

```http
GET / HTTP/1.1
Host: example.com
Sec-CH-Locale-Extensions-NumberingSystem: "deva"
```

4. The server can then tailor the response accordingly. 

Note that servers **must** ignore hints that they do not support. Note also that although each of the locale extension preferences can be accessed individually, no `Client Hint` can be sent unless it is consistent with one of the valid locale extension strings for the content's locale.
</div>


## Final Notes on Security and Privacy

[Mitigating Browser Fingerprinting in Web Specifications](https://www.w3.org/TR/fingerprinting-guidance/#fingerprinting-mitigation-levels-of-success) identifies the following key elements for fingerprint mitigation:

1. Decreasing the fingerprinting surface
2. Increasing the anonymity set
3. Making fingerprinting detectable (i.e. replacing passive fingerprinting methods with active ones)
4. Clearable local state

The preservation of a relatively large anonymity set for all users is our central strategy for mitigating fingerprinting risk as much as possible while also ensuring a substantial improvement in the localization experience for a wide range of users. 

As noted in the [Security Considerations](https://datatracker.ietf.org/doc/html/rfc8942#section-4) section of the HTTP Client Hints RFC, a key benefit of the Client Hints architecture is that it allows for proactive content negotiation without exposing passive fingerprinting vectors, because servers must actively advertise their use of specific Client Hints headers. This makes it possible to remove preexisting passive fingerprinting vectors and replace them with relatively easily detectable active vectors. The Detectability section of [Mitigating Browser Fingerprinting in Web Specifications](https://www.w3.org/TR/fingerprinting-guidance/#detectability) describes instituting requirements for servers to advertise their use of particular data as a best practice, and mentions Client Hints as a tool for implementing this practice. In the absence of Client Hints, use of the JavaScript API can at least be detected by clients. In no case does this proposal allow for any new passive fingerprinting vectors. A site that attempts to (for example) request numbering system preferences while delivering content that supports no alternates is immediately visible as a bad actor: upon encountering this behavior from servers, browsers could issue warnings to users.

The use of the 'Sec-' prefix forbids access to headers containing 'Locale Extensions' information from JavaScript, and demarcates them as browser-controlled client hints so that they can be documented and included in requests without triggering CORS preflights. 

The JavaScript's API's constraint against retrieving multiple preferences with one call serves to make fingerprinting detection easier.

As in all uses of Client Hints, user agents must clear opt-in Client Hints settings when site data, browser caches, and cookies are cleared.

## FAQ

### Options that aren't captured by Unicode Extensions for BCP 47

There exist other localization-related customizations that would be useful for site intelligibility - most notably, number separators and number patterns. Support for a commonly used subset of these options could be possible, particularly in cases where they strongly correlate with a particular combination of valid lcale extension strings.

### Adding and removing additional locale extension strings

A conservative approach should be taken in adding and especially in removing available locale extension strings. This is in order to avoid situations wherein (for example) users are unsure what scale a given temperature is in, or situations where a user who had previously been allowed to use their preferred numbering system no longer have access to it.

### How many possible locale extension strings will be supported in each locale?

Answering this question responsibly will require user research. A key consideration is ensuring that all browser locales receive at least as much ability to express alternate preferences as the most commonly used locales do.

### Why is fingerprinting mitigation so important in this context?

1. Fingerprinting mitigation is in general a best practice
2. The specific data we reveal through this mechanism could be sensitive, since it may indicate that the user is a member of a marginalized or threatened identity category
3. The specific data we reveal through this mechanism is specifically about the user, rather than their device, and so could be used for cross-device tracking
4. Because the data is read from OS settings, it is possible for users to not realize they're sending it
