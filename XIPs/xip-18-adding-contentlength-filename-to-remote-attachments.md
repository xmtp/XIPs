---
title: Adding contentLength and filename to remote attachments
description: Adding new fields to remote attachments
author: Pat Nakajima
status: Draft
type: Standard track
category: XRC
created: 2023-2-27
---

## Abstract

This XRC proposes to add two new parameters to the `remoteStaticAttachment` content type: `contentLength` and `filename`.

## Motivation

Right now, clients know that a message has a remote attachment, but know nothing about the remote attachment. This means that they cannot present important details to users, who may not want to download a 1GB attachment over the cellular network. By adding these fields, we can let clients let users make more informed decisions about whether they want to load the remote content.

## Specification

The parameters for `remoteStaticAttachment` MUST include the following:

```ts
{
  // The SHA256 hash of the remote content
  contentDigest: string,
  
  // A 32 byte hex string for decrypting the remote content payload
  secret: string,
  
  // A hex string for the salt used to encrypt the remote content payload
  salt: string,
  
  // A hex string for the nonce used to encrypt the remote content payload
  nonce: string,
  
  // The scheme of the URL. Must be "https://"
  scheme: "https://",
  
  // The filename of the remote attachment
  filename: string,
  
  // The length in bytes of remote attachment
  contentLength: number
}
```


## Backwards Compatibility

The current `remoteStaticAttachment` content type has not been widely adopted yet (it only exists in the iOS SDK at the moment). Still, messages sent before would be considered invalid.

We could change the `MUST` for these parameters to `SHOULD`, but I don't think there are enough messages out there in the wild to make this sacrifice in integrity going forward.

## Reference Implementation

[iOS SDK Reference Implementation](https://github.com/xmtp/xmtp-ios/pull/68/files#diff-e4d7517aac6d7a616ee575721e2b9f0c99bedd75342e079140a64c8c59fb9cfc)

## Security Considerations

People could pass inaccurate or misleading values for these fields, leading to users downloading content that isn't what they expected.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
