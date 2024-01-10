---
xip: 20
title: Reactions content type
description: This XIP draft describes a way to add reactions in clients that support XMTP.
author: Matt Galligan (@galligan)
discussions-to: https://community.xmtp.org/t/reactions-content-type/524
status: Review
type: Standards Track
category: XRC
created: 2024-01-05
---

## Abstract

This XIP introduces the reaction content type for XMTP clients, enabling users to react to messages with emojis. It defines an action field (values: 'added', 'removed') for reaction management, and a schema field (values: 'unicode', 'shortcode-\*', 'custom') for categorizing emoji types. This standardization aims to enhance communication efficiency and engagement across XMTP clients.

## Motivation

The goal of this content type is to bring a dynamic and expressive form of communication to the XMTP ecosystem. Reactions are integral in modern messaging, allowing for rapid, non-verbal responses in conversations. Implementing this standard promises to streamline communication, making it more effective and enjoyable as well as consistent with expectations of current messaging apps.

## Specification

The reaction content type includes:

- reference (string): The ID of the message being reacted to.
- emoji (string): The emoji used in the reaction.
- action (string): Indicates if the reaction is being 'added' or 'removed'.
- schema (string): Categorizes the emoji as ‘unicode’, ‘custom’, ‘shortcode-cldr’, ‘shortcode-cldr-native’, ‘shortcode-discord’, ‘shortcode-emojibase’, ‘shortcode-emojibase-native’, ‘shortcode-emojibase-legacy’, ‘shortcode-github’, ‘shortcode-iamcal’, ‘shortcode-joypixels’, or ‘shortcode-slack’ (shortcode schemas have been pulled from [this list](https://emojibase.dev/docs/shortcodes/))

Example code snippet:

```javascript
// Reacting with a thumbs-up emoji
const reaction: Reaction = {
  reference: originalMessage.id,
  emoji: "👍",
  action: "added",
  schema: "unicode",
};

await conversation.send(reaction, {
  contentType: ContentTypeReaction,
});
```

## Rationale

The action and schema fields provide necessary flexibility for reaction management. `action` addresses the dynamic nature of conversations, while `schema` ensures cross-client consistency. The choice of emoji as a reaction medium leverages its universal appeal and succinct expression capabilities.

## Backwards Compatibility

To maintain backward compatibility, a contentFallback is stored in the codec as text — ensuring that the intent of reactions is conveyed even in non-supporting clients.

## Test Cases

Test cases will validate the interpretation of schema types, handling of action, and effective use of contentFallback. These are essential for ensuring interoperability across XMTP platforms.

## Reference Implementation

The reference implementation in the XMTP SDKs demonstrates the integration of the reaction content type. The full implementation can be accessed in the React playground [here](https://github.com/xmtp/xmtp-react-playground/pull/1/), and we also have a reference implementation in xmtp.chat.

## Security Considerations

Clients SHOULD account for situations when an emoji character is sent that isn’t yet supported by the client or OS. This may happen when an OS update includes new emoji characters, which are then made available to a sender, but may not be supported on the recipient’s client, OS, or device.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
