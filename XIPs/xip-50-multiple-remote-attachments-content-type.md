---
xip: 50
title: Multiple remote attachments content type
description: Content type for multiple remote attachments
author: Cameron Voell (@cameronvoell)
status: Final
type: Standards
category: XRC
created: 2025-01-28
implementation: https://docs.xmtp.org/chat-apps/content-types/attachments#support-multiple-remote-attachments-of-any-size
---

## Abstract

This XIP proposes a new `MultiRemoteAttachment` content type inspired by the existing `RemoteAttachment` content type, that instead allows for multiple remote attachments to be sent in a single message.

Where the `RemoteAttachment` content is a URL pointing to an encrypted protobuf [EncodedContent](https://github.com/xmtp/proto/blob/9c2c26caa69367684d54919fe29a02cb3666a71c/proto/mls/message_contents/content.proto#L26-L42), the `MultiRemoteAttachment` content is a protobuf struct containing an array of remote attachment structs, each specifying a URL, as well as a `contentDigest`, `contentLength`, `nonce`, `scheme`, and `filename`. The idea being that the multiple remote attachment encoded content parameters will specify a secret key and salt for encrypting/decrypting all attachments, but each attachment will have its own nonce, and `contentDigest` for validating the integrity of the individual attachments.

## Motivation

Modern messaging apps commonly support sending multiple attachments, particularly images, in a single message. This XIP standardizes this functionality for the XMTP network.

## Specification

Proposed content type:

```js
{
  authorityId: "xmtp.org"
  typeId: "multiRemoteStaticContent"
  versionMajor: 1
  versionMinor: 0
}
```

The content of the encoded message will be the following protobuf-encoded `MultiRemoteAttachment` object:

```proto
message MultiRemoteAttachment {
 
  // Array of attachment information
  repeated RemoteAttachmentInfo attachments = 1;

}

message RemoteAttachmentInfo {
  // The SHA256 hash of the remote content
  string content_digest = 1;

  // A 32 byte array for decrypting the remote content payload
  bytes secret = 2;
  
  // A byte array for the nonce used to encrypt the remote content payload
  bytes nonce = 3;

  // A byte array for the salt used to encrypt the remote content payload
  bytes salt = 4;
  
  // The scheme of the URL. Must be "https://"
  string scheme = 5;
  
  // The URL of the remote content
  string url = 6;

  // The size of the encrypted content in bytes (max size of 4GB)
  optional uint32 content_length = 7; 

  // The filename of the remote content
  optional string filename = 8;
}
```

Each attachment in the attachments array contains a URL that points to an encrypted `EncodedContent` object. The content must be accessible by an HTTP `GET` request to the URL. The `EncodedContent`'s content type MUST not be another `RemoteAttachment` or `MultiRemoteAttachment`.

By using `EncodedMessage`, we can make it easier for clients to support any message content already used on the network (with the exception of `RemoteAttachment` and `MultiRemoteAttachment` as mentioned above).

The reference implementation uses the `Attachment` type from [XIP-15](https://github.com/xmtp/XIPs/blob/main/XIPs/xip-15-attachment-content-type.md), but if we introduce richer types for things like images or video, those would work here as well, since clients should be able to understand those types once they're settled.

The SDKs will contain helper functions for ensuring that each attachment is encrypted with a different nonce, salt, and secret key.

### An example flow of using the SDK to send a `MultiRemoteAttachment` content type

#### 1. Create two attachment objects that you want to send

```ts
const attachment1: DecryptedLocalAttachment = {
  fileUri: "content://media/external/images/media/image-1.png",
  mimeType: "image/png",
  filename: "image-1.png"
}

const attachment2: DecryptedLocalAttachment = {
  fileUri: "content://media/external/images/media/image-2.png",
  mimeType: "image/png",
  filename: "image-2.png"
}
```

#### 2. Encrypt the attachments and upload attachments

```ts
const remoteAttachments: RemoteAttachmentInfo[] = []
  for (const attachment of [attachment1, attachment2]) {
    // Encrypt the attachment and receive the local URI of the encrypted file
    const { encryptedLocalFileUri, metadata } = await alix.encryptAttachment(attachment)

    // Upload the attachment to a remote server and receive the URL
    const url = testUploadAttachmentForUrl(encryptedLocalFileUri)

    // Build the remote attachment info
    const remoteAttachmentInfo =
      MultiRemoteAttachmentCodec.buildMultiRemoteAttachmentInfo(url, metadata)
    remoteAttachments.push(remoteAttachmentInfo)
  }
```

#### 3. Send the message

```ts
await convo.send({
    multiRemoteAttachment: {
      attachments: remoteAttachments,
    },
  })
```

### Example flow of receiving a `MultiRemoteAttachment` content type

#### 1. Decode the message received in the group

```ts
const message = (await group.messages()).first()
if (message.contentTypeId == 'xmtp.org/multiRemoteStaticContent:1.0') {
    const multiRemoteAttachment: MultiRemoteAttachment = message.content()
}
```

#### 2. Download and decrypt the attachments

```ts
const decryptedAttachments: DecryptedLocalAttachment[] = []
for (const attachment of multiRemoteAttachment.attachments) {
    // Downloading the encrypted payload from the attachment URL and save the local file
    const encryptedFileLocalURIAfterDownload: string = downloadFromUrlForLocalUri(
      attachment.url
    )
    // Decrypt the local file
    const decryptedLocalAttachment = await alix.decryptAttachment({
      encryptedLocalFileUri: encryptedFileLocalURIAfterDownload,
      metadata: {
        secret: attachment.secret,
        salt: attachment.salt,
        nonce: attachment.nonce,
        contentDigest: attachment.contentDigest,
        filename: attachment.filename,
      } as RemoteAttachmentContent,
    })
    decryptedAttachments.push(decryptedLocalAttachment)
  }
```

#### 4. Use the file URIs in the decrypted attachments objects to display the attachment

```ts
const attachment1 = decryptedAttachments[0]
const attachment2 = decryptedAttachments[1]

<Image source={{ uri: attachment1.fileUri }} />
<Image source={{ uri: attachment2.fileUri }} />
```

## Rationale

We initially considered re-using secret keys for all attachments, but decided against it because higher level crypto libraries made using new keys for each attachment the simplest solution.

A design option we added was the option to include a filename and content length for each attachment. This allows clients to predict the size of an attachment before downloading it, and potentially reject a message if the attachment size doesn't match the expected size.

## Backward compatibility

Clients encountering messages of this type must already be able to deal with messages of an unknown content type, so whatever considerations they're making there should work here too.

The fallback text content will just notify the user that they received a multiple remote attachment message which their client doesn't support.

## Reference implementation

- Implementation reference:
  - [React Native](https://github.com/xmtp/xmtp-react-native/pull/602)
  - [iOS](https://github.com/xmtp/xmtp-ios/pull/469)
  - [Android](https://github.com/xmtp/xmtp-android/pull/378)
- Client Usage reference: See [RN Example app code](https://github.com/xmtp/xmtp-react-native/blob/22f139ea37613f909f5fc71689c899f93455b786/example/src/ConversationScreen.tsx) and [related PR](https://github.com/xmtp/xmtp-react-native/pull/602)

## Security considerations

Making requests to servers outside the network could reveal information similar to tracking pixels. This could be somewhat mitigated by not loading this content by default, or at least providing users with a setting.

Having arbitrary data anywhere can be risky, but this is already the case for messages, since there's no server-side validation of message contents (besides size).

### Threat model

The threat model is that if you are in a group chat with someone who is malicious, they may send arbitrary attachments in a chat. Remote attachments could also point to URLs intended to track the IP address of a client app downloading the attachment. The same is true for all URLs in messages in an encrypted group chat, so we recommend requiring a user action to initiate an attachment download to minimize the risk, or recommend that users who don't want to reveal their IP address use a VPN when using an app that is downloading remote attachments.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
