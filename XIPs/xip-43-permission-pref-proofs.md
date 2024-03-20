---
title: Permission preference proofs
description: Enables recipients to sign to specify inbox permission preferences
author: Ry Racherbaumer (@rygine), Nick Molnar (@neekolas), Saul Carlin (@saulmc)
discussions-to: https://community.xmtp.org/t/xip-43-permission-preference-proofs/552
status: Review
type: Standards
category: Interface
created: 2024-02-22
---

## Abstract

This XIP proposes to add an _optional_ signed payload to conversations that client apps can consider as proof that a recipient has granted a sender permission to reach their main inbox.

## Motivation

Today, a recipient must use a full XMTP client to set a universal permission preference such as allowing a sender. This presents challenges to senders due to the XMTP client's bundle size and integration requirements. For integrations such as simple subscribe buttons, these hurdles can be blockers.

To solve these issues, senders can simply ask users to produce a signature attesting to the permission preference update. Inbox apps can consider this signature as proof that the recipient has explicitly opted in to receive the sender's messages. This eliminates the bundle size problem, as very little code is required to initiate signing a message with a user's wallet. It also greatly simplifies integration by providing a single function to obtain the user’s signature and return an encoded payload to be used by SDKs to verify the granted permission.

## Specification

There are 3 components to the proposed workflow:

1. Obtain a permission signature from the user  
    _Requires actions by the **sender** and **receiver**_
2. Create a new conversation with the encoded payload  
    _Requires actions by the **sender**_
3. Verify the permission payload to allow the sender  
    _Requires actions by the **client SDK**_

### Obtain a permission signature from the user

A permission signature must be obtained from a user's wallet, which is then encoded into a payload that can be used by client SDKs to verify and validate opt-in before allowing the sender.

The decoded payload that must be collected by senders will be defined in a protobuf as follows:

```protobuf
message PermissionPayload {
  // the user's signature in hex format
  string signature = 1;
  // approximate time when the user signed
  uint64 timestamp = 2;
  // version of the payload
  uint32 payload_version = 3;
}
```

The message that will be signed by the user's wallet will contain the sender's address and a timestamp. It must include a human-readable explanation, such as follows.

```text
XMTP : Grant inbox permission to sender

Current Time: <ISO 8601 date and time in UTC>
From Address: <ethereum address>

For more info: https://xmtp.org/signatures/
```

A light-weight JavaScript bundle will provide a function that will initiate the signing process and return an encoded payload that senders must store on their end. This function is intended to be used as a callback to a click event, such as clicking on a Subscribe button.

### Create a new conversation with the encoded payload

Once senders have the encoded payload, they can include it when starting a new conversation with a user.

An example of what this might look like:

```ts
const conversation = await client.conversations.newConversation(peerAddress, context, permissionPayload);
```

Users who have created a permission signature may not have an identity on the XMTP network. Senders should check for an identity with `Client.canMessage` prior to starting a new conversation. If a user does not yet have an XMTP identity, the sender can routinely check for a network identity and start a conversation when it's found.

### Verify the permission payload

In order to finalize the permission preference, SDKs must look for the permission payload in new conversations. Using this payload, SDKs can verify that the current user's wallet signed the permission message and validate that the addresses and timestamp match the expected values.

Once the permission payload is verified and validated, the SDKs will then update network permission preferences automatically.

## Backward Compatibility

The encoded permission payload is an _optional_ parameter when starting a new conversation. Existing conversations will not be affected, and client apps using outdated SDKs will continue to work without updates.

## Security Considerations

There are no known negative security implications introduced as a result of collecting a signature from a user and including it as part of a conversation. The contents of the message being signed will be shown to the user beforehand, and the resulting signature is only useful to SDKs connected to the wallet that signed the message.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
