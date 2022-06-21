# Explainer:  Detection of registered protocol handlers

- Contents:
  - [Authors](#authors)
  - [Introduction](#introduction)
  - [Motivation](#motivation)
  - [Risks](#risks)

## Authors

* Javier Fernandez \<jfernandez@igalia.com>

## Introduction

The HTML spec, in the section about the [System state and capabilities](https://html.spec.whatwg.org/multipage/system-state.html#system-state-and-capabilities), defines the [registerProtocolHandler](https://html.spec.whatwg.org/multipage/system-state.html#custom-handlers) method of the `Navigator` interface's to register custom handlers for URL's schemes.

It'd be useful for authors to have an API to determine whether the browser has a handler for a particular protocol, so that it can disable the features associated to such URL's scheme or executing the fallback codepath.

## Motivation

TODO: We would need to request PL some use cases to explain the motivation for such a change in the spec.


## Risks

TODO: I still fail to see the risks, either for users's privacy or site's security, that this new feature could bring.

## Implementation details

The ProtocolHandlerRegistry class provides an API with different methods to determine whether there are handlers for a particular schemes and whether any of those are the default or not. It also deals with the different registration mechanism either browser's policies or user's choice.

The new feature would have to define how much of these logic we want to expose to authors and end users.

