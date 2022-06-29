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

If an html5 player would want to play data from ipfs://, it can check if the protocol handler is registered. If it is then proceed as-is (let the handler do its thing). If it's not then that media player can fallback on some known public gateway.


## Risks

### Privacy considerations

Allowing sites to determine an user preference about a specific scheme associated to a custom handler implies an important fingerprint that browsers should avoid at any means. It may disclose some apps installed by the user, which could potentially correlates with some personal trait, e.g. gender, sexual orientation, political affiliation).

This feature is potentially a source of user tracking capabilities that can be exploted by sites.

There is an [issue](https://github.com/whatwg/html/issues/4456) filed some years ago to discuss a similar feature, whcih has been discarded due to these privacy issues.

## Implementation details

The ProtocolHandlerRegistry class provides an API with different methods to determine whether there are handlers for a particular schemes and whether any of those are the default or not. It also deals with the different registration mechanism either browser's policies or user's choice.

The new feature would have to define how much of these logic we want to expose to authors and end users.

