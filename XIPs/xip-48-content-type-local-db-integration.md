---
xip: 48
title: Queryable content types in Rust
description: This XIP proposes a new way of managing content types in XMTP to make complex content types like reactions, replies, and message filtering easier for XMTP integrators.
author: Cameron Voell (@cameronvoell)
status: Final
type: Standards
category: XRC
created: 2024-11-27
---

## Abstract

This XIP proposes a way of managing XMTP content types in protobufs and Rust to make complex content types like reactions, replies, and message filtering easier for XMTP integrators.

## Motivation

During the upgrade from XMTP V2 (Direct Messaging Only) to XMTP V3 (Groups via the MLS protocol), one developer experience improvement was that the new "V3" SDKs manage a local SQLITE database containing all of a user's groups and messages. At the same time, the core "libxmtp" library that manages all the database logic remained completely agnostic to the message "content types" that were being stored in the database. The fact that the local database code is content type-agnostic has made some queries that would be common in a production consumer messaging app impossible without forcing developers to implement their own extra local persistent data management. This XIP proposes a way to integrate XMTP content types with the core library and local SQLITE storage. This solution will enable the following new SDK functions:

1. Given a message ID, return all the reactions, replies, and read receipt status associated with that message.
2. Given a group ID, return all messages along with each message's reactions, replies, and read receipt status.
3. Given a group ID, return a list of messages filtered by content type, or potentially by content type attribute.

In addition to enabling queries that will make integrators lives easier, storing content types in protobufs and Rust will allow the re-use of encoding and decoding logic across platforms.

## Specification

Previously, each XMTP SDK included its own ContentType implementations that would aim to serialize and deserialize message contents to the same JSON format.

This XIP proposes that new ContentTypes be defined using protobuf definitions that are integrated into the core Rust library. Then, binding structs and encoding/decoding functions can be generated for each language, all from the [libxmtp](https://github.com/xmtp/libxmtp) Rust repo. For a demonstration of code reuse, see the examples below.

### SDK code before content types in Rust

#### xmtp-ios

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

#### xmtp-android

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

### SDK code after content types in Rust

#### libxmtp

By moving content types to Rust, we can define Foreign Function Interface (FFI) objects, as well as encoding and decoding functions that can be re-used in both xmtp-ios and xmtp-android.

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

#### Updated xmtp-ios content codec (using FfiReaction and encodeReaction defined in Rust)

```swift
public struct ReactionCodec: ContentCodec {

    public func encode(content: FfiReaction, client _: Client) throws -> EncodedContent {
        return try EncodedContent(serializedBytes: encodeReaction(content))
    }
    ...
```

#### Updated xmtp-android content codec (using FfiReaction and encodeReaction defined in Rust)

```kotlin
data class ReactionCodec(override var contentType: ContentTypeId = ContentTypeReaction) :
    ContentCodec<FfiReaction> {

    override fun encode(content: FfiReaction): EncodedContent {
        return EncodedContent.parseFrom(encodeReaction(content))
    }
    ...
```

### Example of queryable content fields in Rust

In addition to consolidating encode/decode logic to the libxmtp repo, we can use libxmtp-defined protobuf definitions for deserializing message contents to store content type-specific data in the local database.

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
        }
    }

```

### What about custom content types?

Since the goal of queryable content types is to make _core_ content types easier to use, this XIP will not affect how custom content types are already working in XMTP. Integrators can continue to define and use custom content types as they have been doing. [See docs for more info](https://docs.xmtp.org/inboxes/content-types/custom).

### How will the remote attachment content type be affected by this XIP?

Though querying performance and usability is not the primary concern of the Remote Attachment content type like it is with others like Reaction, Reply, and Read Receipt, there are other advantages of having the core Rust library being aware of the Remote Attachment content type. Much like how content types in Rust can promote reusing Rust defined encoding/decoding logic across platforms, having the remote attachment content type in Rust allows us to reuse code for encrypting/decrypting remote attachments and potentially code for downloading / uploading remote attachments as well. Though this is not the primary goal of the XIP, it exemplifies another advantage of moving core content types to Rust. See [XIP-17 Remote AttachmentContent Types](https://github.com/xmtp/XIPs/blob/main/XIPs/xip-17-remote-attachment-content-type-proposal.md) for more context.

## Rationale

The example specification above utilizes the following protobuf definition to tell the Rust code how to serialize and deserialize the "Reaction" content type:

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

With existing code, we are defining content types in JSON. So why the switch to protobuf?

JSON is especially well suited for XMTP's most popular SDKs, xmtp-js and xmtp-react-native. We initially had a `xmtp-js-content-types` repo that unofficially served as the reference implementation for how to define content types in JSON. This repo eventually was combined into `xmtp-js` to decrease maintenance overhead, and now the other XMTP SDKs have an XIP mandate to all follow the same JSON format, but we can not easily create test cases to enforce this, and different SDKs may temporarily diverge from one another.

Moving content types into Rust allows us to re-think from first principles what would be the best way to define content types so that they are consistent across platforms, and are performant and easy to use in the core Rust library. The [xmtp-proto](https://github.com/xmtp/proto) repo is a perfect language-agnostic solution for addressing those goals. There are some tradeoffs with backward compatibility, which we will discuss below, with different options for mitigating them.

One last perspective to address is whether moving content types from JSON and the JS repo to Protocol Buffers and the Rust repo will make it less accessible for developers to contribute new content types. However, experience has shown that defining new content types has been much easier than making those content types easy to use for developers in high quality consumer apps. The intuition we have is that developers prefer a rich set of well adopted content types that are easy to use over the ability to rapidly add new types that will not be easily adopted by other developers.

## Backward compatibility

As alluded to above, one downside of moving content types from JSON to protobufs is that it will introduce the possibility of two users on different SDK versions expecting to send and receive messages with different encoding logic. Luckily, the `EncodedContent` wrapper struct that wraps all content types has two fields to help deal with these scenarios: the `ContentTypeId` and the `fallback` string. See protobuf definitions below:

```proto
// ContentTypeId is used to identify the type of content stored in a Message.
message ContentTypeId {
  string authority_id = 1;  // authority governing this content type
  string type_id = 2;       // type identifier
  uint32 version_major = 3; // major version of the type
  uint32 version_minor = 4; // minor version of the type
}

// EncodedContent bundles the content with metadata identifying its type
// and parameters required for correct decoding and presentation of the content.
message EncodedContent {
  // content type identifier used to match the payload with
  // the correct decoding machinery
  ContentTypeId type = 1;
  // optional encoding parameters required to correctly decode the content
  map<string, string> parameters = 2;
  // optional fallback description of the content that can be used in case
  // the client cannot decode or render the content
  optional string fallback = 3;
  // optional compression; the value indicates algorithm used to
  // compress the encoded content bytes
  optional Compression compression = 5;
  // encoded content itself
  bytes content = 4;
}
```

### Backward compatibility cases to consider

Users on older SDK versions both using JSON encoding will be fine, and new users both using protobuf encoding will be fine. The cases where backward compatibility will be an issue are the following:

#### 1. A message is sent from a new SDK version to an older SDK version

In this case, the older SDK version will not know how to decode the content type because of its higher ContentTypeId version, and it will instead **use the fallback string** of the EncodedContent wrapper struct.

#### 2. A message is sent from an older SDK version to a newer SDK version

One option is for integrator targeted **SDKs to retain code for decoding older JSON content types**. A second option is to update integrator targeted SDKs to only support the latest protobuf-based content types that will work in new content type based message functions, and to only use fallback text for messages that are not compatible with the latest content types.

### Recommendation

While users on older versions will not be able to decode new content types and will instead see fallback text, it should be relatively straightforward to retain JSON decoding logic in the updated SDKs so that apps on the latest version will keep receiving content types as expected even if not all their chat counterparts have upgraded to new content types yet. This means users on the latest SDK version should not have to settle for fallback text simply because of compatibility issues.

## Test cases

The following content types are proposed for migration to protobufs:

1. Reaction
2. Read Receipt
3. Remote Attachment
4. Reply
5. Transaction Reference

> \* The default Text content type automatically works in Rust because the content and fallback fields are the same. Also, Group Updated Messages and Member Change messages are already implemented in protobufs and Rust, so those are already queryable.

Each of these content types should have:

1. A test case showing that they work as expected when their corresponding codecs are registered upon client creation.
2. A test case showing that when the content type or version is not supported, that the fallback string is returned as expected.

## Reference implementation

The following PRs demonstrate declaring the Reaction content type in protobufs, generating the binding code and extracting queryable fields in Rust, and updating the encoding/decoding and codec structs in Android:

- [xmtp/proto Draft PR](https://github.com/xmtp/proto/pull/232)
- [libxmtp Draft PR](https://github.com/xmtp/libxmtp/pull/1345)
- [xmtp-android Draft PR](https://github.com/xmtp/xmtp-android/pull/343)

## Security considerations

No new security considerations are introduced with this XIP. The security considerations outlined by [XIP-5 Message Content Type](https://github.com/xmtp/XIPs/blob/main/XIPs/xip-5-message-content-types.md#security-considerations)s still apply and will be referenced here:

> This API change allows transmitting arbitrary and therefore potentially dangerous types of content. Complex decoding or presentation logic can trigger undesirable or dangerous behavior in the receiving client. The authority of any given content type SHOULD provide suitable guidance on how to handle the content type safely.

\* In the case of content types managed by the [XMTP GitHub organization](https://github.com/xmtp) the authority would be contributors/admins of the relevant GitHub repos.

### Threat model

As usual, users and developers should aspire to use the latest XMTP SDK versions whenever possible, but you can never be sure whether inboxes you are chatting with on XMTP are using older or modified versions of the SDK. This means that users could configure their messages to specify that they are sending a certain content type, but the format, contents, or intentions of the actual data in the message could be something different. Fortunately, we haven't identified any security issues that would arise from this possibility, but it is something developers utilizing "complex decoding or presentation logic" as mentioned in the quote above, should be aware of. If any more specific threats or examples of misuse arise, this section will be updated.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
