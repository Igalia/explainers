# Explainer:  Predefined Custom Handlers

- Contents:
  - [Authors](#authors)
  - [Introduction](#introduction)
  - [Motivation](#motivation)
  - [Risks](#risks)
  - [Implementation](#implementation)

## Authors

* Javier Fernandez \<jfernandez@igalia.com>

## Introduction

The ```ProtocolHandlerRegistry``` has an API to silently register a custom handler as part of the Registry's initialization logic. This will be the default handler for the specific protocol, but it won't be assigned as won't be stored in the user's preferences storage. 

For now, only [ChromeOS Ash](https://chromium.googlesource.com/chromium/src.git/+/refs/heads/main/chromeos/README.md) uses predefined handlers. Specifically it registers handlers for ```mailto```and ```webcal``` schemes:

```
void ProtocolHandlerRegistry::InstallDefaultsForChromeOS() {
#if BUILDFLAG(IS_CHROMEOS_ASH)
  // Only chromeos has default protocol handlers at this point.
  AddPredefinedHandler(ProtocolHandler::CreateProtocolHandler(
      "mailto",
      GURL("https://mail.google.com/mail/?extsrc=mailto&amp;url=%s")));
  AddPredefinedHandler(ProtocolHandler::CreateProtocolHandler(
      "webcal", GURL("https://www.google.com/calendar/render?cid=%s")));
#else
  NOTREACHED();  // this method should only ever be called in chromeos.
#endif
```

This codepath avoids the privacy and security checks, related to the Secure Context and Same Origin concepts, [defined](https://html.spec.whatwg.org/multipage/system-state.html#normalize-protocol-handler-parameters) in the HTML spec as part of the registerProtocolHandler method of the Custom Handlers API.

However it ignores any handler that doesn't fulfill the ```ProtocolHandler::IsValid``` logic (basically the rest of the parameters normalization steps mentioned above). This flexibility to bypass the security and privacy checks is useful in some cases, where the handler is known and can be considered safe so that it can be defined at build time.

### The Scheme Registry

The ```SchemeRegistry``` data structure is used to declare the schemes registered in the browser and assign some specific properties to different subsets of such group of schemes.

The data structure defines different lists to provide these specific features to the schemes; the main and more basic list is perhaps the ```standard_schems```, which is defined as follows:

> A standard-format scheme adheres to what RFC 3986 calls "generic URI syntax" (https://tools.ietf.org/html/rfc3986#section-3).

There are other lists to lend specific properties to a well-defined set of schemes:

```
  // Schemes that are allowed for referrers.
  std::vector<SchemeWithType> referrer_schemes = {
      {kHttpsScheme, SCHEME_WITH_HOST_PORT_AND_USER_INFORMATION},
      {kHttpScheme, SCHEME_WITH_HOST_PORT_AND_USER_INFORMATION},
  };

  // Schemes that do not trigger mixed content warning.
  std::vector<std::string> secure_schemes = {
      kHttpsScheme, kAboutScheme, kDataScheme, kQuicTransportScheme, kWssScheme,
  };
```

### New list: schemes with Predefined Handlers

The idea behind this proposal is to define a new list of schemes with a custom protocol handler that we want to install as Predefined Handler.

The ```ProtocolHandlerReggistry``` class will be the responsible of using this list to install the predefined handlers, in the way, and under the constraints, explained before.


## Motivation

There are different aspects of this proposals that could be used to motivate its consideration and, eventually and after some iterations to polish its design and implementation, its integration in the Chromium codebase.

### Code easier to maintain

Predefined Handlers is a feature that fits quite well in the general purpose of a Chrome Embedder browser. The mentioned case of ChromeOS Ash is a good example, where 2 very specific schemes are handled accordingly to the OS specific needs.

It's sensible to assume that inside the limited scope of a Chrome Embedder app (browser or webview) we can relax the privacy and security checks defined in the Custom Handlers spec for the registerProtocolHandler method; this scenario could be indeed useful for Android, since it doesn't implement it.

The Chrome's Content Layer offers a Public API that embedders can implement to define its own behavior for certain features.

One of these abstract features is the addition of new schemes to be handled internally. The ```ContentClient``` interface has a method called ```AddAdditionalSchemes``` precisely for this purpose. On the other hand, the ```ContentBrowserClient``` interface provides the ```HasCustomSchemeHandler``` and ```IsHandledURL``` methods to allow embedders implement their specific behavior to handler such schemes.

I think it's more appropriated to avoid the ```ifdef``` approach to implement embeders's specific predefined handlers and instead, use the //content layer interfaces designed for such purpose.

### Avoid relying on Web Extensions

Although the use of predefined handlers is very limited now, I think it could become a powerful feature that Chrome emedders, especially but not exclusively, can use to implement custom handlers for the schemes they considered strategic. 

This new approach allows embedders to avoid having to rely on Web Extensions to implement this custom handler logic. via the ```registerProtocolHandler``` API.

The use of Web Extensions provides flexibility, which is important, but it also puts on the end user the responsibility of evaluating the protocol's handler on several aspects:

* security and privacy breaches
* outdated and unresponsive handler's sites


## Risks

I haven't detected potential risks yet, but probably we'd need a more thorough risks analysys. 

## Implementation

The first step is to extend the ```SchemeRegistry``` class with a new data structure, an associative ```map``` in this case to associate a scheme with its handler. There will be APIs to retrieve and modify the new data structure.

```
// Schemes with a predefined default custom handler.
std::map<std::string, std::string> predefined_handler_schemes;

void AddPredefinedHandlerScheme(const char* new_scheme, const char* handler) {
  DoAddSchemeWithHandler(
      new_scheme, handler,
      &GetSchemeRegistryWithoutLocking()->predefined_handler_schemes);
}

const std::map<std::string, std::string>& GetPredefinedHandlerSchemes() {
  return GetSchemeRegistry().predefined_handler_schemes;
}
```

Once we have support for adding schemes and their associated handler, we would need to modify the ```ProtocolHandlerRegistry``` class to use it to install the handlers. As before, we must ensure this logic is executed **before** or **during** the registry initialization process.

Instead of a hardcoded implementation of the predefined handlers, we could just access the SchemeRegistry and retrieve the registered schemes with predefined handlers. Something like this would be enough:


```
 for (const auto& [scheme, handler] : url::GetPredefinedHandlerSchemes()) {
    AddPredefinedHandler(
        ProtocolHandler::CreateProtocolHandler(scheme, GURL(handler)));
  }
```

Finally, embedders would just need to implement the ```ChromeContentClient::AddAdditionalSchemes``` interface to register a scheme and its associated handler.

For instance, in order to install in Android a predefined handler for the ```IPFS``` protocol, we would just need to add in the ```AwContentClient::AddAdditionalSchemes``` function the following logic:

```
  schemes->predefined_handler_schemes["ipfs"] =
        "https://dweb.link/ipfs/?uri=%s";
  schemes->predefined_handler_schemes["ipns"] =
        "https://dweb.link/ipns/?uri=%s";
```


