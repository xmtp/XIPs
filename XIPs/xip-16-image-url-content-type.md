---
xip: 16
title: Image Url Content Type
description: Content type for image url
author: JsonPreet
status: Review
type: Standards Track
category: XRC
created: 2023-02-17
---

## Abstract

Based on [XIP-5](https://github.com/nakajima/XIPs/blob/patch-1/XIPs/xip-5-message-content-types.md) this XRC proposes a new content type xtmp.org/media-image-url:1.0 for Media Image Url only, that do not consist of text. For this content type developers have to send External Image url as string. No extra parameters required. 

## Motivation

As per users requirements, and for my platform I decided to create a new content type for XMTP which also help to other developers for their apps. We can send any type Image Url and it supports GIF url also.

## Specification

Proposed content type:

```js
new ContentTypeId({
    authorityId: "xmtp.org",
    typeId: "media-image-url",
    versionMajor: 1,
    versionMinor: 0,
})

class ImageCodec {
    get contentType() {
        return ContentTypeImageKey
    }

    encode(content: string): EncodedContent {
        return {
            type: ContentTypeImageKey,
            parameters: {},
            content: new TextEncoder().encode(content),
        }
    }

    decode(content: EncodedContent): string {
        // console.log(content.content.toString())
        const uint8Array = content.content
        const key = new TextDecoder().decode(uint8Array)
        return key
    }
}
```

The message MUST include the following parameters:

```js
{
  altTag: string
}
```


The content of the encoded message is arbitrary data. The content MUST not be more than 1MB.

## Backward compatibility

Clients encountering messages of this type must already be able to deal with messages of an unknown content type, so whatever considerations they're making there should work here too.

## Live Demo's
[Pinsta.xyz](https://pinsta.xyz)
[Testnet.Pinsta.xyz](https://testnet.pinsta.xyz)

## Reference implementation

- [Implementation reference](https://xmtp.notion.site/XMTP-Codecs-for-Images-Videos-551d566e63c64007a1e727e1bd62f488)

## Security considerations

This content type allows arbitrary and it's may risky. Uploading image is processed by client side. Security checks can be add on client side as well.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).