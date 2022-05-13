# Explainer:  Permission automation for registerProtocolHandler

- Contents:
  - [Authors](#authors)
  - [Introduction](#introduction)
  - [Motivation](#motivation)
  - [Risks](#risks)

## Authors

* Javier Fernandez \<jfernandez@igalia.com>

## Introduction

The HTML spec, in the section about the [System state and capabilities](https://html.spec.whatwg.org/multipage/system-state.html#system-state-and-capabilities), defines the [registerProtocolHandler](https://html.spec.whatwg.org/multipage/system-state.html#custom-handlers) method of the `Navigator` interface's to register custom handlers for URL's schemes.

The spec is a bit ambiguous, but defines a procedure to ask the user to grant permissions to register a handler for a specific URL scheme.

> User agents may, within the constraints described, do whatever they like. A user agent could, for instance, prompt the user and offer the user the opportunity to add the site to a shortlist of handlers, or make the handlers their default, or cancel the request. User agents could also silently collect the information, providing it only when relevant to the user.

It's important to note that the concept of *permission* used in the spec is not related to the Permission API spec, which has precisely the goal of defining a common infrastructure that other specifications can use to interact with browser permissions.

Additionally, the Permission API specification has an appendix about [Automated testing](https://w3c.github.io/permissions/#automation), which defines some extension commands for the WebDriver specification for the purposes of user-agent automation and application testing.

One of these extension commands is the [SetPermission](https://w3c.github.io/permissions/#automation). It simulates user modification of a [PermissionsDescriptor](https://w3c.github.io/permissions/#dom-permissiondescriptor)'s permission state.

To set permission for ```{name: "midi", sysex: true}``` of the current settings object of the session with ID 23 to ``"granted"``, the local end would POST to ```/session/23/permissions``` with the body:

```json
{
  "descriptor": {
    "name": "midi",
    "sysex": true
  },
  "state": "granted"
}
```

The Web Platform Test suite provides an implementation of the SetPermssion command through the [testdriver.js Automation](https://web-platform-tests.org/writing-tests/testdriver.html?highlight=driver#testdriver-js-automation).

The [set_permission](https://web-platform-tests.org/writing-tests/testdriver.html?highlight=driver#set-permission) matches the Matches the behaviour of the *Set Permission* WebDriver command.

Usage: test_driver.set_permission(descriptor, state, one_realm=false, context=null)

* *descriptor*: a [PermissionsDescriptor](https://w3c.github.io/permissions/#dom-permissiondescriptor) or derived object
* *state*: a [PermissionState](https://w3c.github.io/permissions/#dom-permissionstate) value
* *one_realm*: a boolean that indicates whether the permission settings apply to only one realm
* *context*: a WindowProxy for the browsing context in which to perform the call

## Motivation

The main goal of this feature is to provide Automated testing support for the registerProtocolHandler method, so that we could avoid the user prompt dialog to grant permission for the protocol handler registration.

We would need to define a new [PermissionName](https://w3c.github.io/permissions/#dom-permissiondescriptor-name) that we can use as part of the ```PermissionDescriptor``` argument for the _SetPermission_ command.

Currently there are only manual tests in the WPT repository to cover the registerProtocolHandler functionality. The main challenges to implement automated testing are:

- UserActivation: The registerProtocolHandler method requires transient activation to consider the request; otherwise it'll be **ignored**.
- Permission prompt dialog: Although the spec is quite vague on this regard, current implementations (Firefox and Chrome) requires the user to grant permissions for the handler registration.

Using the ```test_driver.set_permission``` function we could make tests like this way:

```js
function register() {
  navigator.registerProtocolHandler("web+burger",
                                    "https://burgers.example.com/?burger=%s",
                                    "Burger handler"); // last title arg included for compatibility
}

promise_setup(async () => {
  await test_driver.set_permission({name: 'protocol-handler'}, 'granted');
  await test_driver.bless('handler registration'); // Provides UserActivation
  register();
});

promise_test(async t => {
    const a = document.body.appendChild(document.createElement("a"));
    a.href = web+burger:xxxx;
    a.target = "_blank";
    a.click();
    await new Promise(resolve => {
      bc.onmessage = t.step_func(e => {
        resultingURL = e.data;
        assert_equals(resultingURL, "xxx");
        resolve();
      });
    });
  });
}
```

## Risks

### WebContent exposure

Although the main goal of the feature is provide automated testing, the new PermissionName, that will be part of the PermissionDescritor used by the SetPermission command, is also available for other methods of the Permission interface. 

The navigator.permission.query method could retrieve the status of the new PermissionDescriptor, doing something like this:

```js
    function done(result) {
        console.log('Status: ' + result.status);
        console.log('Value: ' + result.value);
    }

    let query = { name: 'protocol-handler' };
    navigator.permissions.query(query)
      .then(function(value) {
          done({ status: 'success', value: value && value.state });
      }, function(error) {
          done({ status: 'error', value: error && error.message });
      });
```


The new 'protocol-handler' permission name will be added to the PermissionNanme enumeration, defined in the [Permissions.webidl](https://searchfox.org/mozilla-central/source/dom/webidl/Permissions.webidl) in Firefox while Chrome has the [permission_descriptor.idl](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/permissions/permission_descriptor.idl;drc=f35c2f3fa70024abdcb62c7a7b1019267607d486).

These IDLs will be used for the Javascript generated bindinds, which will throw an TypeError exception if the name is not supported (not listed in the mentioned enums). This is clearly defined in the [query()](https://w3c.github.io/permissions/#query-method) method specification and will affect also to the SetPermission command.

Hence, it seems there is no way to implement the Automated permission without exposing the new PermissionName to web contents.


### Privacy and security considerations

As it's been stated in the motivation section, the main goal of this feature is to provide automated testing. It's not intended to be be available for regular web content. Even more, it should be prevented the use of this feature to allow sites to silently register handlers without the user consent, or at least noticing it.

What the spec states about silent registration must be a browser capability only, not available for the web site.
