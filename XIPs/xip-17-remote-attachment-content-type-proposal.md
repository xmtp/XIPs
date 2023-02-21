---
xip: 17
title: Remote Attachment Content Type
description: Content type for remote attachments
author: Pat Nakajima
status: Review
type: Standards Track
category: XRC
created: 2023-02-15
---

## Abstract

This XRC proposes a new content type for messages that do not consist of text and/or are too large to be sent on the XMTP network. It builds on [XIP 15](https://github.com/xmtp/XIPs/pull/15)'s basic attachment type, but instead of messages being sent on the network, the message contains a URL. The contents of the URL is an `Envelope` that can be decoded by clients.

## Motivation

The current 1MB limit for messages on the XMTP network is too small for many types of content. To enable larger files, external storage is going to be necessary.

## Specification

Proposed content type:

```js
{
  authorityId: "xmtp.org"
  typeId: "remoteAttachment"
  versionMajor: 0
  versionMinor: 1
}
```

The content of the encoded message is a URL that points to encoded Envelope data that would not be limited by the 1MB limit, since it's not being sent on the network. By using the existing `Envelope` format, we can still ensure E2E encryption for this data.

The envelope itself can contain any type of message already allowed on the network. The reference implementation uses the `Attachment` type from XIP 15, but if we introduce richer types for things like images or video, those would work here as well, since clients should be able to understand those types once they're settled.

## Backward compatibility

Clients encountering messages of this type must already be able to deal with messages of an unknown content type, so whatever considerations they're making there should work here too.

## Reference implementation

- [Implementation reference](https://github.com/xmtp/xmtp-ios/pull/68)
- [Client Usage reference](https://github.com/xmtp-labs/xmtp-inbox-ios/pull/83)

## Security considerations

Having arbitrary data anywhere can be risky, but this is already the case for our messages, since there's no server side validation of message contents (besides size). The same protections we have now would be in place while the same pitfalls we have would still be there as well.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
