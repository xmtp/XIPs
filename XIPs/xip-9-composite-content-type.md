---
title: XRC-9: Composite content type
description: Generic content type for multi-part content
author: Martin Kobetic (@mkobetic)
status: Final
type: Standards Track
category: XRC
created: 2022-04-07
---

## Abstract

Based on [XIP-5](xip-5-message-content-types.md) this XRC proposes a new content type `xtmp.org/composite:1.0` for multi-part messages where the parts can be of any content type and the composite parts can be arbitrarily nested.

## Motivation

Combining different kinds of content in a single messages seems obviously useful. Providing a generic facility to do that (similar to the MIME multipart content types) could satisfy some use-cases, although more specific types designed to support particular use-cases may prove more popular in the long run. Especially since more specialized solutions will be easier to use (e.g. may infer content type rather then requiring content type IDs explicitly), and provide additional facilities (e.g. provide hints about proper presentation of the content). Even if this generic type does not end up being widely used, it will also serve as an educational tool for future content type authors.

## Specification

Composite content MUST be structured to satisfy the type `Composite` as follows

```ts
export type Composite =
  | {
      type: ContentTypeId
      content: any
    }
  | { parts: Composite[] }
```

This allows for arbitrarily deep tree structure where the leaves are the actual content of arbitrary content type. For example

```ts
const content = { parts: [
    { type: ContentTypeText, content: 'one' },
    { parts: [
        { type: ContentTypeText, content: 'two' },
        { parts: [{ type: ContentTypeText, content: 'three' }] },
        { type: ContentTypeText, content: 'four' }]}]}
```

This type of content SHALL be identified with following `ContentTypeId`

```ts
export const ContentTypeComposite = new ContentTypeId({
  authorityId: 'xmtp.org',
  typeId: 'composite',
  versionMajor: 1,
  versionMinor: 0,
})
```

The codec, `CompositeCodec`, SHALL use protobuf for encoding of the `Composite` structure. This allows for leveraging the `EncodedContent` type already defined by the protocol and consequently seamless reuse of other codecs to handle the specific content types carried by the Composite. The protobuf definition of the encoded content SHALL be as follows:

```protobuf
message Composite {
  message Part {
    oneof element {
      EncodedContent part = 1;
      Composite composite = 2;
    }
  }

  repeated Part parts = 1;
}
```

## Rationale

It is unclear at this point what particular aspects of multipart content will be relevant in practice, consequently this initial proposal is about as simple as it gets. Subsequent revisions can add more features, although there is some expectation that more specialized content types will be preferred for specific use-cases. Protobuf has been chosen to keep the implementation simple, which should support the educational goals of this proposal.

## Reference Implementation

The reference implementation is intended to be part of the XMTP SDK. [https://github.com/xmtp/xmtp-js/pull/96](https://github.com/xmtp/xmtp-js/pull/96). The codec will not be part of the default Client setup, clients wishing to employ this codec SHOULD register this codec explicitly.

## Security Considerations

This content type allows transmitting arbitrary and therefore potentially dangerous types of content. Complex decoding or presentation logic can trigger undesirable or dangerous behavior in the receiving client. Security considerations associated with all of the content types used as parts of a Composite apply to the Composite as well.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
