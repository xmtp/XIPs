---
xip: 14
title: Brand info schema in conversation metadata
description: Schema to enable standardized sharing of brand information as it relates to conversationId
author: Yash Lunagaria (@yash-luna)
status: Review
type: Standards Track
category: XRC
created: 2023-01-31
---

## Abstract

This XIP proposes a schema for sharing brand information as it relates to `conversationId`. A standard way to represent this information in conversation `metadata` will enable different front-ends to surface the context captured by `conversationId` in a consistent, user-friendly manner while still affording clients design and UI flexibility.

## Motivation

The SDK API currently accepts a unique `conversationId` per address pair and allows `metadata` to be set as well. Today, different apps use these parameters in different ways and therefore other apps may not know how to render the `conversationId` appropriately within the UI to reflect the corresponding brand. We propose a schema to standardize the use of conversation `metadata` for the purpose of client-side brand expression stemming from the `conversationId`. The `metadata` field may include other non-standard (or future standard) properties.

Note that the schema is only applicable when setting a non-null `conversationId`. If `conversationId` is null, the SDK does not allow setting `metadata`.

## Specification

Proposed `brandInfo` schema in conversation `metadata`

```json
{
    conversationId: "mydomain.xyz/abc/qrs",
    metadata: { "brandInfo.displayName": "My company", "brandInfo.profileImage": "mydomain.xyz/assets/myimage.png", "brandInfo.primaryColor": "#ffffff" }
}
```

Example `brandInfo` implementation for a chat app named Galaxy

```json
{
    conversationId: "galaxy.chat/dm/uniqueIdentifier",
    metadata: { "brandInfo.displayName": "Galaxy", "brandInfo.profileImage": "galaxychat.xyz/brandassets/logo.png", "brandInfo.primaryColor": "#6865B8" }
}
```

The `profileImage` must meet the following criteria:

- Aspect ratio: 1:1
- Minimum resolution: 100x100
- Maximum resolution: 800x800
- Format: .PNG, .WEBP

The `primaryColor` must be a hex color code.

## Backwards Compatibility

Existing conversations will not be affected by the adoption of the new schema; only conversations created after the new schema is finalized will follow the updated schema.

To maintain backwards compatibility, clients may consider rendering popular but older schemas (such as Lens), present in conversations created before the finalization of this XRC, in a manner consistent with their updated schema that follows this XRC.

Old Lens schema:

```json
{
        conversationId: "lens.dev/dm/${memberA}-${memberB}"
        metadata: {}
}
```

New Lens schema

```json
{
    conversationId: "lens.dev/dm/${memberA}-${memberB}"
    metadata: { "brandInfo.displayName": "Lens", "brandInfo.profileImage": "lens.xyz/assets/myimage.png", "brandInfo.primaryColor": "#ffffff" }
}
```

## Security considerations

The metadata field can be spoofed by malicious apps to display Names and Images that degrade the user experience and are harmful to the brand’s perception. A mechanism for apps to sign messages and related metadata can enable front-ends to verify if the signature is from a credible source in order to prevent such spoofing. An affordance for client verifiability is under consideration.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
