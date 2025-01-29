---
xip: 50
title: Multiple remote attachments content type
description: Content type for multiple remote attachments
author: Cameron Voell (@cameronvoell)
discussions-to: https://community.xmtp.org/t/xip-50-multiple-remote-attachments-content-type/864
status: Draft
type: Standards
category: XRC
created: 2025-01-28
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
  // A 32 byte array for decrypting the remote content payload
  bytes secret = 1;
  
  // A byte array for the salt used to encrypt the remote content payload
  bytes salt = 2;
  
  // Array of attachment information
  repeated RemoteAttachmentInfo attachments = 3;

   // The number of attachments in the attachments array
  optional uint32 num_attachments = 4;
  
  // The maximum content length of an attachment in the attachments array
  optional uint32 max_attachment_content_length = 5;
}

message RemoteAttachmentInfo {
  // The SHA256 hash of the remote content
  string content_digest = 1;
  
  // A byte array for the nonce used to encrypt the remote content payload
  bytes nonce = 2;
  
  // The scheme of the URL. Must be "https://"
  string scheme = 3;
  
  // The URL of the remote content
  string url = 4;
  
  // The filename of the remote content
  string filename = 5;
}
```

Each attachment in the attachments array contains a URL that points to an encrypted `EncodedContent` object. The content must be accessible by an HTTP `GET` request to the URL. The `EncodedContent`'s content type MUST not be another `RemoteAttachment` or `MultiRemoteAttachment`.

By using `EncodedMessage`, we can make it easier for clients to support any message content already used on the network (with the exception of `RemoteAttachment` and `MultiRemoteAttachment` as mentioned above).

The reference implementation uses the `Attachment` type from [XIP-15](https://github.com/xmtp/XIPs/blob/main/XIPs/xip-15-attachment-content-type.md), but if we introduce richer types for things like images or video, those would work here as well, since clients should be able to understand those types once they're settled.

The same secret key and salt are used for encrypting/decrypting all attachments. The SDKs will contain helper functions for ensuring that a different nonce is used for each attachment in the attachments array.

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

#### 2. Encrypt the attachments

```ts
const {encryptedAttachmentsPreUpload, secret, salt} = await client.encryptAttachments([attachment1, attachment2])
```
  
#### 3. Upload the attachments

```ts
const encryptedAttachmentsPostUpload: RemoteAttachmentInfo[] = await Promise.all(
  encryptedAttachmentsPreUpload.map(async (attachment) => {
    // Integrator customizable code for uploading an attachment and retrieving the URL
    const uploadedUrl = await upload(attachment); 
    
    // Merge the uploaded URL back into the original attachment data
    return {
      ...attachment,
      url: uploadedUrl,
    };
  })
);
```

#### 4. Construct `MultiRemoteAttachment` content type

```ts
const multiRemoteAttachment: MultiRemoteAttachment = {
  secret,
  salt,
  attachments: encryptedAttachmentsPostUpload
}
```

#### 5. Send the message

```ts
const message = await group.sendMessage(multiRemoteAttachment)
```

### Example flow of receiving a `MultiRemoteAttachment` content type

#### 1. Decode the message received in the group

```ts
const message = (await group.messages()).first()
if (message.contentTypeId == 'xmtp.org/multiRemoteStaticContent:1.0') {
    const multiRemoteAttachment: MultiRemoteAttachment = message.content()
}
```

#### 2. Download the attachments

```ts
const encryptedAttachments = downloadAttachments(multiRemoteAttachment)
```

#### 3. Decrypt the attachments

```ts
const decryptedAttachments = await client.decryptAttachments(encryptedAttachments)
```

#### 4. Use the file URIs in the decrypted attachments objects to display the attachment

```ts
const attachment1 = decryptedAttachments[0]
const attachment2 = decryptedAttachments[1]

<Image source={{ uri: attachment1.fileUri }} />
<Image source={{ uri: attachment2.fileUri }} />
```

## Rationale

Another design option would be to have separate secret keys and salts for each attachment in a remote attachment content type. We decided against this because the array of secrets would still be sent in the same message payload, so it wasn't clear that this would be more secure than the current proposal. To ensure reusing the secret doesn't leak information, we use a unique nonce for each attachment in the attachments array.

A design option we added was the option to include a filename and content length for each attachment. This allows clients to predict the size of an attachment before downloading it, and potentially reject a message if the attachment size doesn't match the expected size.

## Backward compatibility

Clients encountering messages of this type must already be able to deal with messages of an unknown content type, so whatever considerations they're making there should work here too.

The fallback text content will just notify the user that they received a multiple remote attachment message which their client doesn't support.

## Reference implementation

- Implementation reference: TODO
- Client Usage reference: TODO

## Security considerations

Making requests to servers outside the network could reveal information similar to tracking pixels. This could be somewhat mitigated by not loading this content by default, or at least providing users with a setting.

Having arbitrary data anywhere can be risky, but this is already the case for messages, since there's no server-side validation of message contents (besides size).

### Threat model

The threat model is that if you are in a group chat with someone who is malicious, they may send arbitrary attachments in a chat. Remote attachments could also point to URLs intended to track the IP address of a client app downloading the attachment. The same is true for all URLs in messages in an encrypted group chat, so we recommend requiring a user action to initiate an attachment download to minimize the risk, or recommend that users who don't want to reveal their IP address use a VPN when using an app that is downloading remote attachments.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
