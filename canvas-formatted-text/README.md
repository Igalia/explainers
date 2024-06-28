# Canvas Text WICG Proposal

## _Fast Formatted Text for the Web_

This doc: https://github.com/Igalia/explainers/tree/canvas-formatted-text/

Authors: Fernando Serboncini, Aaron Krajeski, Alice Boxhall and Stephen Chenney

Last Modified: June 28, 2024

Status: In review

Other public docs: [MSEdgeExplainers/FormattedText.md at main](https://github.com/MicrosoftEdge/MSEdgeExplainers/blob/main/Canvas/FormattedText.md)

This document groups use cases for the Canvas Text WICG and provides high level explainers on the proposals for each area. The use cases are Editing, Styled and Accessible Text, and Text As Art.

## <a name="Editing"></a>Editing

[New Canvas Text Metrics APIs](#text-metrics-additions) will support selection and editing of text in canvas, reducing the need for javascript solutions.

## <a name="placeELement"></a>HTML-in-Canvas

[APIs for placing html content into a canvas](#html-in-canvas.md) support rich, interactive HTML content in a canvas context. We also provide [notes on a chromium implementation](#chromium-implementation-notes.md).

## <n name="ArtDesign"/></a>Text in Art and Design

[New Canvas Text Metrics APIs](#text-art.md) enable precise placement of individual graphemes, even when they do no correspond to a single character in a text string.