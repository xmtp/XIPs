# Message Content Types

![Lint](https://github.com/xmtp/XIPs/actions/workflows/lint.yml/badge.svg)

## Abstract

Abstract is a multi-sentence (short paragraph) technical summary. This should be a very terse and human-readable version of the specification section. Someone should be able to read only the abstract to get the gist of what this specification does.

---

This XIP introduces a framework for interoperable support of different types of content in XMTP messages. At the heart of it are provisions for attaching meta-information to the content, that will identify its type and structure, and allow for its correct decoding from the encoded form used for transport inside XMTP messages. Main features of the framework are as follows.

* namespacing the content type identifiers to allow different entitities (including xmtp.org) to define and manage their respective suite of content types
* versioning the identifier format to allow future changes to it
* versioning the content types themselves to allow their future evolution
* optionally attaching parameters to the content type identifier (key/value style) to carry metadata necessary for correct decoding of the content  
* leaving support for multi-part payload to a potential future structured payload type to keep the basic framework simple
* including optional `fallback` string in the basic framework that can be used to provide descriptive explanation to users when their client cannot correctly decode or present the content type
* defining the first few content types:
  * xmtp.org/text (optional encoding parameter, default utf-8 (not friendly to non-latin alphabets))
  * ...

## Motivation

The motivation section should describe the "why" of this XIP. What problem does it solve? Why should someone want to implement this standard? What benefit does it provide to the XTMP ecosystem? What use cases does this XIP address?

---

The API currently accepts only `string` as the message content, which suggests to the user that only plain text is supported. Given the ambition of builing a community around the protocol that would be motivated to build a wide array of very different clients and applications around it, we need to enable at least future possibility of using different types of content beyond just plain text (rich text, images, video, sound, file attachments, etc).

However given that this is a large and complex topic we don't want to have to solve it all right now. We want a flexible framework that will allow building a rich library of various types of supported content over time. This library should be open to collaboration with other organizations. The framework should be simple, but powerful enough to not hinder future development. The framework should also provide a reasonably friendly API that isn't too onerous to use.

## Specification

The key words “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

The technical specification should describe the syntax and semantics of any new feature. The specification should be detailed enough to allow competing, interoperable implementations for any of the current XMTP platforms.

---

### Protocol

At the network level the Message payload is currently represented by Ciphertext

```protobuf
message Ciphertext {
    message AES256GCM_HKDFSHA256 {
        bytes hkdfSalt = 1;
        bytes gcmNonce = 2;
        bytes payload = 3;
    }
    oneof union {
        AES256GCM_HKDFSHA256 aes256GcmHkdfSha256 = 1;
    }
}
```

Since there is no reason to expose the content type meta information unencrypted it makes sense to define a new type that will be embedded in the Ciphertext.payload bytes. That means there will be two layers of protobuf encoding here since we need bytes as input into the encryption layer. Let's refer to the outer encoding layer that turns the entire message into bytes as `Message Encoding` and the inner layer that turns the payload into bytes as `Content Encoding`.

```protobuf
message EncodedContent {
  ContentTypeId contentType = 1;
  map<string, string> contentTypeParams = 2;
  optional string contentFallback = 3;
  bytes content = 4;
}
```

The encoding process will then go through the following steps:

1. Encode the content into its binary form
2. Wrap it into the EncodedContent structure and encode it using protobuf (content encoding)
3. Encrypt the EncodedContent into bytes and wrap those in the Ciphertext structure
4. Wrap the Ciphertext in a Message structure and encode it using protobuf (message encoding)

The decoding process is the reverse of that.

We will not introduce a separate version for the embedded type, it can be tied to the version of the overall protocol.

#### Content Type Identifier and Parameters

The `ContentTypeId` identifies the type and format of the information contained in the content. It needs to carry enough information to be able to route the decoding process to the correct decoding machinery. As such the identifier should carry following bits of information:

* authority ID
* content type ID
* content type version

Identifier format is tied to the protocol version. Changes to the format will require corresponding protocol version adjustment. Such changes may add new information to the identifier but it should only be information that is required to match the identifier with the corresponding decoding machinery or information that is required for all content types (like the content type version). Any information that is specific to a content type should be carried in the content type parameters field.

Authority ID identifies the entity that governs a suite of content types, their definitions and implementations. `xmtp.org` is one such organization. Authority ID should be unique and be widely recognized as belonging to the entity. DNS domains or ENS names can serve this purpose (e.g. `uniswap.eth`). The authority is responsible for providing a definition of the content type and its encoding parameters as well as the associated implementation.

Content type ID identifies particular type of content that can be handled by a specific implementation of its encoding/decoding rules. Content type version allows future evolution of the content type definition.

Content type version is captured in the common major.minor structure intended to convey the associated semantics that versions differing in the minor version only should be backward compatible, i.e. a client supporting an earlier version should be able to adequately present content with later version. Content type authority SHOULD manage the evolution of content type in a manner that respects this constraint.

Due forethought should be given when choosing identifiers as there are no provisions to change them once they have been in use. A new identifier introduces a new (assumed unrelated) authority or content type as far as the protocol is concerned.

### API

To accommodate the new content type framework, the low level `Message` encode/decode API has to work in terms of bytes instead of strings. The protocol level `EncodedContent` message introduced above will be represented by `EncodedContent` interface that allows bundling the content bytes with the content type metadata.

```ts
export interface EncodedContent {
  contentType: ContentTypeId
  contentTypeParams: Record<string, string>
  contentFallback?: string
  content: Uint8Array
}
```

This is a fairly simple change but makes for a very anemic and hard to use API. Given that content types should be highly reusable it makes sense to provide a framework that will facilitate this reuse and provide some common content types out of the box. The framework should provide automatic content encoding/decoding based on the type of the provided content.

Supported content types are represented by TS type `MessageContent` that bundles the `content` with the `contentType` identifier.  Each content type will have an associated `ContentEncoder<T>`.

```ts
export type MessageContent =
  | string
  | {
      readonly contentType: ContentTypeId
      readonly content: any
    }

export interface ContentEncoder<T> {
  contentType: ContentTypeId
  encode(message: T): EncodedContent
  decode(content: EncodedContent): T
}
```

The `contentType` field of the encoder is used to match the encoder with the corresponding `contentType` of the content.

We can support plain `string` as valid content in a backward compatible manner (with some hardcoded typeof checks in a few places) as follows.

```ts
export const ContentTypeText = {
  authorityId: 'xmtp.org',
  typeId: 'text',
  versionMajor: 1,
  versionMinor: 0,
}

export class TextContentEncoder implements ContentEncoder<string> {
  get contentType(): string {
    return ContentTypeText
  }

  encode(content: string): EncodedContent {
    return {
      contentType: ContentTypeText,
      contentTypeParams: {},
      content: new TextEncoder().encode(content),
    }
  }

  decode(content: EncodedContent): string {
    return new TextDecoder().decode(content.content)
  }
}
```

The mapping between content types and their encoders will be managed at the Client level. The Client maintains a registry of supported types and encoders initialized to a default set of encoders that can be overriden/extended through the `CreateOptions`.

```ts
export default class Client {
  ...
  registerEncoder(encoder: ContentEncoder<any>): void
  ...
  encoderFor(contentType: ContentTypeId): ContentEncoder<any> | undefined 
  ...
```

The client API will accept any `MessageContent` to send, and the `Message` type will be augmented to hold the decoded content instead of just the `decrypted: string`.

```ts
export default class Message implements proto.Message {
  header: proto.Message_Header // eslint-disable-line camelcase
  ciphertext: Ciphertext
  decrypted?: Uint8Array
  // content allows attaching decoded content to the Message
  // the message receiving APIs need to return a Message to provide access to the header fields like sender/recipient
  content?: MessageContent
  error?:   
  ...
  get getContent(): any {
    if (!this.content) {
      return undefined
    }
    if (typeof this.content === 'string') {
      return this.content
    }
    return this.content.content
  }

```

Note that the `Message.text` getter that previously just returned the `decrypted` string, will have to be replaced with `Message.content`. The clients of the API will need to interrogate the result and do the right thing based on the content type. `Message.getContent` getter shows how that might look.

If an unrecognized content type is received the `Message.error` will be set accordingly, but if the `contentDescription` is present the `Message.content` will be set to the description. In order to be able to distinguish the actual content from the description, we will introduce a special `contentType`.

```ts
// This content type is used to provide the recipient
// the alternative content description (if present)
// in case the content type is not supported.
export const ContentTypeAlternativeDescription = {
  authorityId: 'xmtp.org',
  typeId: 'alternative-description',
  versionMajor: 1,
  versionMinor: 0,
}

export class AlternativeContentDescription {
  content: string
  constructor(description: string) {
    this.content = description
  }

  get contentType(): string {
    return ContentTypeAlternativeDescription
  }
}
```

## Rationale

The rationale fleshes out the specification by describing what motivated the design and why particular design decisions were made. It should describe alternate designs that were considered and related work, e.g. how the feature is supported in other languages.

---

There are decades of prior art in this area. Probably the most familiar example of content type identification scheme are filename extensions. The relevant lesson here is that simple string is likely insufficient for carrying the necessary parameters required to correctly decode the contents (what encoding is the `.txt` file using?). While structured file formats can easily embed those parameters in the file itself, if we do want to support unstructured payload, e.g. plain text, we probably should have a way to attach parameters to the content type identifier itself.

MIME framework (the underlying standard of email, http and other widely used protocols) has a fairly involved sytem using several headers Content-Type, Content-Transfer-Encoding, Content-Disposition etc. Notably the Content-Type header allows embedding arbitrary set of parameters in the header value along with the primary type identifier (media type). Most relevant is [RFC 2046](https://datatracker.ietf.org/doc/html/rfc2046) which discusses the basic media types. At the highest level it recognizes 5 fundamental media types: text, image, audio, video and composite media types. The composite media type is of particular interest as it allows combining different media types in single payload. As soon as you support composite media type, there are additional aspects that likely need to be addressed, e.g. are the different parts just different renderings of the same information (multipart/alternative), or are they different parts of longer narrative (multipart/mixed). Is any individual part meant to be rendered inline with the rest of the content, or is it meant to be an attachment that can be open/saved separately (Content-Disposition)? MIME also prescribes the central authority (IANA) that manages the registry of all recognized media types and their required or optional parameters.

## Backwards Compatibility

All XIPs that introduce backwards incompatibilities must include a section describing these incompatibilities and their severity. The XIP must explain how the author proposes to deal with these incompatibilities. XIP submissions without a sufficient backwards compatibility treatise may be rejected outright.

---

Since the new EncodedType message is embedded in the Ciphertext.payload bytes, this change doesn't break the protocol, strictly speaking, however any newer client would struggle interpretting the payload as EncodedContent unless it conforms. So this is a breaking change in that sense. Any older messages will be broken once the new protocol is deployed.

At the API level the changes are even more pronounced, since the input and output of the API is now any type that matches `MessageContent` instead of just `string`. Exracting the content from the Message now requires interrogating the resulting value to determine which type of content it is and handling it accordingly. Clients SHOULD also take an appropriate action when encountering content type they do not recognize, and use the `contentFallback` when available. Clients SHOULD register encoders only for those types that they are prepared to handle.

## Reference Implementation

An optional section that contains a reference/example implementation that people can use to assist in understanding or implementing this specification.  If the implementation is too large to reasonably be included inline, then consider adding it as one or more files in `../assets/xip-####/`.

---

https://github.com/xmtp/xmtp-js/pull/68

## Security Considerations

All XIPs must contain a section that discusses the security implications/considerations relevant to the proposed change. Include information that might be important for security discussions, surfaces risks and can be used throughout the life cycle of the proposal. E.g. include security-relevant design decisions, concerns, important discussions, implementation-specific guidance and pitfalls, an outline of threats and risks and how they are being addressed. XIP submissions missing the "Security Considerations" section will be rejected. An XIP cannot proceed to status "Final" without a Security Considerations discussion deemed sufficient by the reviewers.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
