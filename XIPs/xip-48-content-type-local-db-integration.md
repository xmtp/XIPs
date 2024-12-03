---
xip: 48
title: Queryable Content Types in Rust
description: This XIP proposes a new way of managing content types in XMTP in order to make complex content types like reactions, replies, and message filtering easier for XMTP integrators.
author: cameronvoell; cameron@ephemerahq.com; cvoell.eth
discussions-to: URL where the XIP draft will be discussed.
status: Draft
type: Standards
category: XRC
created: 2024-11-27
---

## Abstract

This XIP proposes a way of managing XMTP content types in protobufs and rust in order to make complex content types like reactions, replies, and message filtering easier for XMTP integrators.

## Motivation

During the upgrade from XMTP V2 (Direct Messaging Only) to XMTP V3 (Groups via the MLS protocol), one developer experience improvement was that the new "V3" SDKs manage a local SQLITE database containing all of a user's groups and messages. At the same time, our core "libxmtp" library that manages all the database logic remained completely agnostic to the message "content types" that were being stored in the database. While this separation of content types from the database logic was great for keeping complexity down during initial developement, it has made some quieries that would be common in a production consumer messaging app impossible without forcing developers to implement their own extra local persistent data management. An example of this is when the SDK returnsall message types in order received for a group, how can you efficiently render the emoji reactions, replies and read reciepts for each message in your UI? In order to address these types of queries, this XIP proposes a way to integrate XMTP content types with our core library and local SQLITE storage.

In addition to enabling queries that will make integrators lives easier, storing content types in protobufs and rust will allow us to re-use encoding and decoding logic across platforms. 

## Specification

Previously, each XMTP SDK included their own ContentType implementations that would aim to serialize and deserialize message contents to the same JSON format. 

This XIP proposes new ContentTypes be defined using protobuf definitions that are integrated into our core rust library. Then binding objects and encoding/decoding functions can be generated for each language all in our libxmtp rust repo.

### SDK Code Before Content Types in Rust

#### xmtp-ios:
```swift
public struct Reaction: Codable {
    public var reference: String
    public var action: ReactionAction
    public var content: String
    public var schema: ReactionSchema
    ...
}

public struct ReactionCodec: ContentCodec {

    public func encode(content: Reaction, client _: Client) throws -> EncodedContent {
        var encodedContent = EncodedContent()

        encodedContent.type = ContentTypeReaction
        encodedContent.content = try JSONEncoder().encode(content)

        return encodedContent
    }
    ...
```

#### xmtp-android:
```kotlin
data class Reaction(
    val reference: String,
    val action: ReactionAction,
    val content: String,
    val schema: ReactionSchema,
)

data class ReactionCodec(override var contentType: ContentTypeId = ContentTypeReaction) :
    ContentCodec<Reaction> {

    override fun encode(content: Reaction): EncodedContent {
        val gson = GsonBuilder()
            .registerTypeAdapter(Reaction::class.java, ReactionSerializer())
            .create()

        return EncodedContent.newBuilder().also {
            it.type = ContentTypeReaction
            it.content = gson.toJson(content).toByteStringUtf8()
        }.build()
    }
    ...
```
### SDK Code After Content Types in Rust

#### libxmtp:
By moving content types to rust, we can define Foreign Function Interface (FFI) objects, as well as encoding and decoding functions that can be re-used in both xmtp-ios and xmtp-android.

```rust
#[derive(uniffi::Record, Clone, Default)]
pub struct FfiReaction {
    pub reference: String,
    pub reference_inbox_id: String,
    pub action: FfiReactionAction,
    pub content: String,
    pub schema: FfiReactionSchema,
}


#[uniffi::export]
pub fn encode_reaction(reaction: FfiReaction) -> Result<Vec<u8>, GenericError> {
    // Use ReactionCodec to encode the reaction
    let encoded = ReactionCodec::encode(reaction.into())
        .map_err(|e| GenericError::Generic { err: e.to_string() })?;

    // Encode the EncodedContent to bytes
    let mut buf = Vec::new();
    encoded
        .encode(&mut buf)
        .map_err(|e| GenericError::Generic { err: e.to_string() })?;

    Ok(buf)
}
```

#### Updated xmtp-ios content codec (using FfiReaction and encodeReaction defined in Rust):
```swift
public struct ReactionCodec: ContentCodec {

    public func encode(content: FfiReaction, client _: Client) throws -> EncodedContent {
        return try EncodedContent(serializedBytes: encodeReaction(content))
    }
    ...
```

#### Updated xmtp-android content codec (using FfiReaction and encodeReaction defined in Rust):
```kotlin
data class ReactionCodec(override var contentType: ContentTypeId = ContentTypeReaction) :
    ContentCodec<FfiReaction> {

    override fun encode(content: FfiReaction): EncodedContent {
        return EncodedContent.parseFrom(encodeReaction(content))
    }
    ...
```

In addition to consolidating encode/decode logic to our libxmtp repo, we can use libxmtp defined protobuf definitions for deserializing message contents in order to store content type specific data in our local database.

An example of how this could work with the "Reaction" content type is below:

```rust

    /// Helper function to extract queryable content fields from a message
    fn extract_queryable_content_fields(message: &[u8]) -> QueryableContentFields {
        // Attempt to decode the message as EncodedContent
        let encoded_content = match EncodedContent::decode(message) {
            Ok(content) => content,
            Err(e) => {
                tracing::debug!("Failed to decode message as EncodedContent: {}", e);
                return QueryableContentFields {
                    parent_id: None,
                    is_readable: None,
                };
            }
        };
        let encoded_content_clone = encoded_content.clone();

        // Check if it's a reaction message
        let parent_id = match encoded_content.r#type {
            Some(content_type) if content_type.type_id == ReactionCodec::TYPE_ID => {
                // Attempt to decode as reaction
                match ReactionCodec::decode(encoded_content_clone) {
                    Ok(reaction) => {
                        // Decode hex string into bytes
                        match hex::decode(&reaction.reference) {
                            Ok(bytes) => Some(bytes),
                            Err(e) => {
                                tracing::debug!(
                                    "Failed to decode reaction reference as hex: {}",
                                    e
                                );
                                None
                            }
                        }
                    }
                    Err(e) => {
                        tracing::debug!("Failed to decode reaction: {}", e);
                        None
                    }
                }
            }
            _ => None,
        };

        QueryableContentFields {
            parent_id,
            is_readable: None,
        }
    }
```

<!-- The specification should describe the technical syntax and semantics of any new feature. The specification should be detailed enough to enable competing and interoperable implementations for any current XMTP platform.

Follow RFC 2119 for terminology and start the specification section with this paragraph:

The keywords “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt). -->

## Rationale

The example specification above utilizes the following protobuf definition to tell our rust code how to serialize and deserialize the "Reaction" content type:

```proto
// Reaction message type
message Reaction {
  // The message ID being reacted to
  string reference = 1;

  // The inbox ID of the user who sent the message being reacted to
  // Optional for group messages
  string reference_inbox_id = 2;

  // The action of the reaction (added or removed)
  ReactionAction action = 3;

  // The content of the reaction 
  string content = 4;

  // The schema of the reaction content
  ReactionSchema schema = 5;
}
```

With existing code, we are defining our content types in JSON. So why the switch to protobuf?

JSON is especially well suited for our most popular SDKs, xmtp-js and xmtp-react-native. We initally had a `xmtp-js-content-types` repo that unoffically served as the reference implementation for how to define content types in JSON. This repo eventually was combined into `xmtp-js` in order to decrease maintenance overhead, and now our other SDKs have an XIP mandate to all follow the same JSON format, but we can not easily create test cases to enforce this, and different SDKs may temporarily diverge from ones another. 

Moving content types into rust allows us to re-think from first principles what would be the best way to define content types so that they are consistent across platforms, and are performant and easy to use in our core rust library. Our [xmtp-proto](https://github.com/xmtp/proto) repo is a perfect language agnostic solution for addressing those goals. There are some tradeoffs with backward compatibility, which we will discuss below, with different options for mitigating them. 

One last perspective to address is whether moving content types from our JSON and our JS repo to Protocol Buffers and our Rust repo will make it less accessible for developers to contribute new content types. However, experience has shown that defining new content types has been much easier than making those content types easy to use for developers in high quality consumer apps. The intuition we have is that developers prefer a rich set of well adopted content types that are easy to use over the ability to rapidly add new types that will not be easily adopted by other developers. 

<!-- The rationale fleshes out the specification by describing what motivated the design and particular design decisions. The rationale should describe alternate designs that were considered and related work, such as how the feature supports other languages. The rationale may also provide evidence of consensus within the community and should share important objections or concerns raised during those discussions. -->

## Backward compatibility

<!-- All XIPs that introduce backward incompatibilities must include a section describing these incompatibilities and their severity. The XIP must explain how the author proposes to deal with these incompatibilities. XIP submissions without a sufficient backward compatibility treatise may be rejected outright. -->

As alluded to above, one downside of moving content types from JSON to protobufs is that clients on older versions will be unable to decode the new content types using existing JSON deserialization logic. We have a few options for mitigating this:

1. 

## Test cases*

<!-- Include tests inline in the XIP as data, such as input/expected output pairs. If the test suite is too large to reasonably include inline, consider adding it as one or more files in `../assets/xip-n/<filename>`, where `n` is to be replaced with the XIP number. *Test cases are optional. -->

## Reference implementation*

<!-- A reference/example implementation that people can use to assist in understanding or implementing this specification. If the implementation is too large to reasonably be included inline, then consider adding it as one or more files in `../assets/xip-n/<filename>`, where `n` is to be replaced with the XIP number. *A reference implementation is optional. -->

## Security considerations

<!-- The security considerations include design decisions, concerns, and implementation-specific guidance and pitfalls that might be important to security discussions about the proposed change. It surfaces threats and risks and how they are being addressed. The information should be useful throughout the proposal's lifecycle.

An XIP cannot proceed to Final status without a discussion of security considerations deemed sufficient by the XIP reviewers. XIP submissions missing security considerations will be rejected outright. -->

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
