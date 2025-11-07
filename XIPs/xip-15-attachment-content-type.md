---
xip: 15
title: Attachment Content Type
description: Content type for basic attachments
author: Pat Nakajima
status: Final
type: Standards
category: XRC
created: 2023-02-15
implementation: https://docs.xmtp.org/chat-apps/content-types/attachments#support-attachments-smaller-than-1mb
---

## Abstract

This XRC proposes a new content type for messages that do not consist of text. It attempts to include only the bare minimum for clients to determine how to display such messages in order to provide flexibility for more rich types in the future.

## Motivation

Not everything in a conversation is text. MMS, email attachments, gifs, etc are all examples of times when communications have gone beyond words. In order to provide users a real messaging platform, XMTP needs to provide this capability.

## Specification

Proposed content type:

```js
{
  authorityId: "xmtp.org"
  typeId: "attachment"
  versionMajor: 0
  versionMinor: 1
}
```

The message MUST include the following parameters:

```ts
{
  mimeType: string,
  filename: string,
}
```

The content of the encoded message is arbitrary data. It's up to clients to use the mime type and filename to determine how to render the message. The content MUST not be more than 1MB.

## Backward compatibility

Clients encountering messages of this type must already be able to deal with messages of an unknown content type, so whatever considerations they're making there should work here too.

## Reference implementation

- [Implementation reference](https://github.com/xmtp/xmtp-ios/pull/62)
- [Client Usage reference](https://github.com/xmtp-labs/xmtp-inbox-ios/pull/65)

## Security considerations

Having arbitrary data anywhere can be risky, but this is already the case for our messages, since there's no server side validation of message contents (besides size). The same protections we have now would be in place while the same pitfalls we have would still be there as well.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
