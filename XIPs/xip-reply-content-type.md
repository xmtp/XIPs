---
xip: 
title: Reply Content Type
description: Content type for reply messages
author: Kunal Mondal
status: Draft 
type: Standards Track
category: XRC
created: 2023-03-24
---

## Abstract

This XRC proposes a new content type for messages that enriches the messaging experience. It attempts to include only the bare minimum for clients to determine how to display such messages in order to provide flexibility for more rich types in the future.

## Motivation

When it comes to having a comfortable conversation, replying to messages is an absolute no brainer as it gives users the freedom to converse without any miscommunications. In order to provide users a real messaging platform, XMTP needs to provide this capability.

## Specification

Proposed content type:

```js
{
  authorityId: "xmtp.org"
  typeId: "reply"
  versionMajor: 0
  versionMinor: 1
}
```

The reply message MUST include the following parameters:

```ts
{
  // The ID of the message that is being replied to
  inReplyToID: string
}
```

The content of the encoded message is an EncodedContent object, serialized in the protobuf format (since we're guaranteed to always have the ability to deserialize that.)

The content type of the reply's `EncodedContent` MUST be allowed. By default, the only allowed content type is `ContentTypeText`, but additional types can be optionally allowed as well.

## Backward compatibility

Clients encountering messages of this type must already be able to deal with messages of an unknown content type, so whatever considerations they're making there should work here too.

## Reference implementation

- [PR implementation for the JS SDK](https://github.com/xmtp/xmtp-js-content-types/blob/baed02476cd94c6ceef24c107a86a162efaec678/reply/src/Reply.ts)

## Security considerations

Having different message content structure in content types breaks the uniformity which might be risky, but this is also the case for other content types, since there's no server side validation of message contents (besides size). The same protections we have now would be in place while the same pitfalls we have would still be there as well.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
