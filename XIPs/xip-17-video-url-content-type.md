---
xip: 17
title: Video Url Content Type
description: Content type for video url
author: JsonPreet
status: Review
type: Standards Track
category: XRC
created: 2023-02-17
---

## Abstract

Based on [XIP-5](https://github.com/nakajima/XIPs/blob/patch-1/XIPs/xip-5-message-content-types.md) this XRC proposes a new content type xtmp.org/media-video-url:1.0 for Media Video Url only, that do not consist of text. For this content type developers have to send External Video url as string. No extra parameters required. 

## Motivation

In Conversation adding Images & Gif's content type, it's good point if we add Video support too. For real messaging platform, XMTP needs to provide these features.

## Specification

Proposed content type:

```js
{
  authorityId: "xmtp.org"
  typeId: "media-video-url"
  versionMajor: 0
  versionMinor: 1
}
```


The content of the encoded message is arbitrary data. The content MUST not be more than 1MB.

## Backward compatibility

Clients encountering messages of this type must already be able to deal with messages of an unknown content type, so whatever considerations they're making there should work here too.

## Live Demo's
[Testnet.Pinsta.xyz](https://testnet.pinsta.xyz)

## Reference implementation

- [Implementation reference](https://xmtp.notion.site/XMTP-Codecs-for-Images-Videos-551d566e63c64007a1e727e1bd62f488)

## Security considerations

This content type allows arbitrary and it's may risky. Uploading videos is processed by client side. Security checks can be add on client side as well.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).