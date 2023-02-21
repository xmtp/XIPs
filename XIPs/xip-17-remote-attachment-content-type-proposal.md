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

This XRC proposes a new content type for messages that do not consist of text and/or are too large to be sent on the XMTP network. It builds on [XIP 15](https://github.com/xmtp/XIPs/pull/15)'s basic attachment type, but instead of messages being sent on the network, the message contains a URL. The contents of the URL is an encrypted protobuf encoded `EncodedContent` that can be decrypted and decoded by clients.

## Motivation

The current 1MB limit for messages on the XMTP network is too small for many types of content. To enable larger files, external storage is going to be necessary.

## Specification

Proposed content type:

```js
{
  authorityId: "xmtp.org"
  typeId: "remoteStaticContent"
  versionMajor: 0
  versionMinor: 1
}
```

The encoded content MUST have the following parameters:

```js
{
	// The SHA256 hash of the remote content
	contentDigest: string,
	
	// A 32 byte hex string for decrypting the remote content payload
	secret: string,
	
	// A hex string for the salt used to encrypt the remote content payload
	salt: string,
	
	// A hex string for the nonce used to encrypt the remote content payload
	nonce: string
}
```

The content of the encoded message is a URL that points to an encrypted `EncodedContent` object. The `EncodedContent`'s content type MUST not be another `RemoteAttachment`.

By using `EncodedMessage`, we can make it easier for clients to support any message content already used on the network (with the exception of `RemoteAttachment` as mentioned above).

The reference implementation uses the `Attachment` type from XIP 15, but if we introduce richer types for things like images or video, those would work here as well, since clients should be able to understand those types once they're settled.

## Backward compatibility

Clients encountering messages of this type must already be able to deal with messages of an unknown content type, so whatever considerations they're making there should work here too.

## Reference implementation

- [Implementation reference](https://github.com/xmtp/xmtp-ios/pull/68) (needs update)
- [Client Usage reference](https://github.com/xmtp-labs/xmtp-inbox-ios/pull/83) (needs update)

## Security considerations

Making requests to servers outside the network could reveal information similar to tracking pixels. This could be somewhat mitigated by not loading this content by default, or at least providing users with a setting.

Having arbitrary data anywhere can be risky, but this is already the case for our messages, since there's no server side validation of message contents (besides size).

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
