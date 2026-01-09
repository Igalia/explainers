# Explainer: The window ownership hierarchy

- Contents:
  - [Authors](#Authors)
  - [Introduction](#Introduction)
  - [Proposal](#Proposal)
  - [Risks](#Risks)
  - [Security and Privacy Considerations](#Security-and-Privacy-Considerations)

## Authors

* Cathie Chen \<cathiechen@igalia.com>

## Introduction
In complex scenarios like financial trading platforms and design tools, users often need to open multiple windows across multiple monitors. Currently, the web lacks native support for coordinated window management, forcing users to operate each window individually, which is time-consuming and inefficient.

Desktop operating systems provide "window ownership" that connects two windows as an owner window (parent window) and an owned window (child window). The owned window is attached to the owner window, allowing control over several aspects: Z-order, lifespan, movement, and reactivation. This provides significant convenience for complex applications.
While browsers provide `window.open()` to create new windows with some connection to their creator, these windows lack the hierarchical relationship found in desktop operating systems. All browser windows are treated equally. They aren't grouped or organized in a parent-child structure. As a result, users must manage each window individually.

Let's take a close look at the different window operation.
Z-Order: When two browser windows overlap, there is no hierarchy-the active window is always on top. However, users often want to keep a small window visible while interacting with a larger window behind it. Although features like Picture-in-Picture exist, they are currently limited to media pages. With window ownership, owned windows could optionally stay on top of their owner window, making this pattern broadly available.

Lifespan: Browser windows' lifespans are independent. In complex scenarios where several pop-up windows are related to a main window, users must close them individually or terminate the entire browser application, neither option is ideal. With window ownership, it is natural to connect their lifespan, windows could be naturally grouped: closing the owner window would automatically close all owned windows, streamlining window management.

Movement: Browser windows move independently of each other. In scenarios where several pop-up windows are related to a main window, switching context becomes cumbersome. Users must move each window individually to another area of the screen or to a different monitor. This becomes even more complex when trying to maintain the relative positioning between windows. With window ownership, owned windows could optionally move with their owner window automatically, preserving their spatial relationships and simplifying workspace management.

Reactivation: When the browser is running in the background, users need to bring windows back to the foreground. Currently, each window must be reactivated individually. With window ownership, clicking on owner window would bring all owned windows to the foreground simultaneously, making it much more convenient to resume work with multi-window applications.

Windows with an ownership hierarchy can be grouped naturally. Users don't need to operate windows individually. They can be managed as a group, providing convenience for complex web applications.

## Proposal
We propose adding "window ownership" capabilities to the window interface, enabling browsers to better support complex multi-window applications by establishing parent-child relationships between windows.

### Core Concepts

**Owner Window**: A window that has one or more owned windows attached to it.

**Owned Window**: A window that is attached to another window, establishing a parent-child relationship.

**Ownership Constraint**: An owned window must be created by its owner window (e.g., via `window.open()`). Windows cannot establish an ownership relationship unless one created the other.

When windows are attached in this hierarchy, the following behaviors are defined:

- **Z-Order**: The owned window can remain on top of its owner window, even when the owner is active.
- **Lifespan**: Closing the owner window automatically closes all its owned windows. Closing an owned window does not affect its owner.
- **Movement**: The owned window can be configured to move automatically with its owner window, maintaining their relative positions.
- **Reactivation**: Activating owner window brings owned windows to the foreground together.

### Proposed API

**`window.open()`**: The behavior of `window.open()` remains unchanged. Windows created through this method are not automatically added to the ownership hierarchy.

**`window.ownedWindows`**: Returns an array of windows that are owned by this window.

**`window.addOwnedWindow(window, stayOnTop, sticky)`**: Attaches a window as an owned window. The `stayOnTop` parameter controls whether the owned window stays on top of its owner. The `sticky` parameter controls whether the owned window moves together with its owner window.

**`window.removeOwnedWindow(ownedWindow)`**: Detaches an owned window from its owner.

**`window.ownerWindow`**: Returns the owner window if this window is owned by another window, or `null` otherwise.

## Risks

### User Experience
- **Unexpected Window Behavior**: Users unfamiliar with window ownership may find it confusing when windows close together or move in sync. However, once adapted, this behavior significantly improves productivity in complex multi-window scenarios.
- **Accidental Data Loss**: Closing an owner window could unintentionally close owned windows with unsaved work. Appropriate warnings should be deliveried to the users before closure to prevent data loss.

### Compatibility on different platforms
- **Browser Support Fragmentation**: Different browsers may implement window ownership features inconsistently, leading to varying behavior across platforms.
- **Operating System Constraints**: Operating systems differ in their window ownership models. Some platforms may not support all proposed features, limiting what browsers can implement.
- **Mobile Platforms**: Window ownership concepts don't translate well to mobile browsers with limited multi-window support. This feature may need to be restricted to desktop platforms.
- **Window Manager Conflicts**: Browser-level window ownership may conflict with OS-level window management, particularly when the browser engine is embedded in applications with existing ownership hierarchies. The feature may need to be limited to standard browser scenarios.

### Developer Complexity
- **API Misuse**: Developers might create overly complex window hierarchies that become difficult to debug and maintain. However, the ownership constraint mitigates this risk by requiring that owned windows be created by their owner window. Since these windows already have an existing relationship through `window.open()`, the ownership API simply formalizes and strengthens this connection rather than introducing arbitrary relationships.

## Security and Privacy Considerations
This feature does not reveal extra sensitive information, and there is no data kept across browsing sessions.

