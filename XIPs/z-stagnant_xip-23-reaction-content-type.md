---
xip: 23
title: Reaction Content Type
description: Proposes a content type that lets users react to messages using emojis
author: Kunal Mondal (@Im-Kunal-13)
status: Stagnant 
type: Standards
category: XRC
created: 2023-03-24
---

**Important**: The finalized Reaction Content Type is defined by [XRC-20: Reactions content type](./xrc-20-reaction-content-type.md). For the original pull request submitted by Kunal Mondal (@Im-Kunal-13), see [https://github.com/xmtp/XIPs/pull/23](https://github.com/xmtp/XIPs/pull/23).

## Abstract

This XRC proposes a new content type that enriches the messaging experience and lets users express themselves using emojis. It attempts to include only the bare minimum for clients to determine how to display such messages to provide flexibility for more rich types in the future.

## Motivation

When it comes to having a comfortable conversation, reacting to messages with emojis is necessary as it gives users the freedom to express their messages in the form of emojis. To provide users with a real messaging platform, XMTP needs to provide this capability.

## Specification

Proposed content type:

```js
{
    authorityId: "xmtp.org",
    typeId: "reaction",
    versionMajor: 1,
    versionMinor: 0,
}
```

The reaction MUST include the following parameters:

```ts
{
    // The message ID that this reaction is being added to
    reactingToId: string
}
```

The content of the encoded message must be a string consisting of a single emoji character.

## Backward compatibility

Clients encountering messages of this type must already be able to deal with messages of an unknown content type, so whatever considerations they're making there should work here, too.

## Reference implementation

- [PR implementation for the JS SDK](https://github.com/xmtp/xmtp-js-content-types/blob/d859187c00d216069cffbb2f6a847cd276e5225a/reaction/src/Reaction.ts)

## Security considerations

Different message content structures in content types break uniformity, which might be risky, but this is also the case for other content types since there's no server-side validation of message contents other than size. The same protections we have now would be in place, while the same pitfalls would still be there.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
