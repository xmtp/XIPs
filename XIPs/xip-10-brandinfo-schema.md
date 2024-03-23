---
xip: 14
title: Conversation context metadata schema
description: Schema to enable standardized sharing of conversation context
author: Yash Lunagaria (@yash-luna)
status: Review
type: Standards Track
category: XRC
created: 2023-01-31
---

## Abstract

This XIP proposes a schema for sharing additional context about a conversation beyond `conversationId`. It introduces associated conversation metadata alongside a `conversationId` to enable front-ends to display useful contextual information consistently and in a user-friendly manner while maintaining flexibility in UI and UX.

## Motivation

The SDK API currently accepts a unique `conversationId` per address pair and allows `metadata` to be set as well. Today, different apps use these parameters in different ways. Therefore an app may not know how to correctly render in its UI `conversationId` and `metadata` for conversations originating from other apps. We propose a schema to standardize the use of conversation `metadata` for the purpose of app brand expression stemming from the `conversationId`. The `metadata` field may include other non-standard (or future standard) properties.

Note that the schema is only applicable when a valid`conversationId` is set. If `conversationId` is null, the SDK does not allow setting `metadata`.

## Specification

Proposed `displayInfo` schema in conversation `metadata`

```json
{
    conversationId: "mydomain.xyz/abc/qrs",
    metadata: { 
        "displayInfo.prettyName": "My company", 
        "displayInfo.profileImage": "mydomain.xyz/assets/myimage.png", 
        "displayInfo.primaryColor": "#ffffff" }
}
```

Example `displayInfo` implementation for a chat app named Galaxy

```json
{
    conversationId: "galaxy.chat/dm/uniqueIdentifier",
    metadata: { 
        "displayInfo.prettyName": "Galaxy", 
        "displayInfo.profileImage": "galaxychat.xyz/brandassets/logo.png", 
        "displayInfo.primaryColor": "#6865B8" }
}
```

The `profileImage` must meet the following criteria:

- Aspect ratio: 1:1
- Minimum resolution: 100x100
- Maximum resolution: 800x800
- Format: .PNG, .WEBP

The `primaryColor` must be a hex color code.

## Backward compatibility

Existing conversations will not be affected by the adoption of the new schema. Only conversations created after the new schema is finalized will follow the updated schema.

To maintain backward compatibility, clients may consider rendering popular but older schemas (such as Lens), present in conversations created before the finalization of this XRC, in a manner consistent with their updated schema that follows this XRC.

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
    metadata: { 
        "displayInfo.prettyName": "Lens", 
        "displayInfo.profileImage": "lens.xyz/assets/myimage.png", 
        "displayInfo.primaryColor": "#ffffff" }
}
```

## Security considerations

The `metadata` fields can be spoofed by malicious apps to display names and profile images that degrade the user experience and harm brand perception. A mechanism for apps to sign payloads such as conversation metadata and messages can enable frontends to verify the sending client's identity and prevent such spoofing. An affordance for client verifiability is under consideration.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
