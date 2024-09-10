---
xip: 43
title: Consent proofs
description: Enables recipients to sign to specify inbox consent preferences
author: Ry Racherbaumer (@rygine), Nick Molnar (@neekolas), Saul Carlin (@saulmc)
status: Final
type: Standards
category: Interface
created: 2024-02-22
---

## Abstract

This XIP proposes to add an _optional_ signed payload to conversations that client apps can consider as proof that a recipient has granted a sender consent to reach their main inbox.

## Motivation

Today, a recipient must use a full XMTP client to set a universal permission preference such as allowing a sender. This presents challenges to senders due to the XMTP client's bundle size and integration requirements. For integrations such as simple subscribe buttons, these hurdles can be blockers.

To solve these issues, senders can simply ask users to produce a signature attesting to the consent update. Inbox apps can consider this signature as proof that the recipient has explicitly opted in to receive the sender's messages. This eliminates the bundle size problem, as very little code is required to initiate signing a message with a user's wallet. It also greatly simplifies integration by providing a single function to obtain the user's signature and return an encoded payload to be used by SDKs to verify the granted consent.

## Specification

There are three components to the proposed workflow:

1. Obtain a consent signature from the user  
   _Requires actions by the **sender** and **receiver**_
2. Create a new conversation with the encoded payload  
   _Requires actions by the **sender**_
3. Verify the consent payload to allow the sender  
   _Requires actions by the **client SDK**_

### Obtain a consent signature from the user

A consent proof signature must be obtained from a user's wallet, which is then encoded into a payload that can be used by client SDKs to verify and validate opt-in before allowing the sender.

The decoded payload that must be collected by senders will be defined in a protobuf as follows:

```protobuf
message ConsentProofPayload {
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
XMTP : Grant inbox consent to sender

Current Time: <ISO 8601 date and time in UTC>
From Address: <ethereum address>

For more info: https://xmtp.org/signatures/
```

A lightweight JavaScript bundle will provide a function that will initiate the signing process and return an encoded payload that senders must store on their end. This function is intended to be used as a callback to a click event, such as clicking a Subscribe button.

### Create a new conversation with the encoded payload

Once senders have the encoded payload, they can include it when starting a new conversation with a user.

Here is an example of what this might look like:

```ts
const conversation = await client.conversations.newConversation(
  peerAddress,
  context,
  consentProofPayload
);
```

Users who have created a consent signature might not have an identity on the XMTP network. Senders should check for an identity with `Client.canMessage` before starting a new conversation. If a user does not yet have an XMTP identity, the sender can routinely check for a network identity and start a conversation when it's found.

### Verify the consent payload

To finalize the consent preference, SDKs must look for the consent payload in new conversations. Using this payload, SDKs can verify that the current user's wallet signed the consent message and validate that the addresses and timestamp match the expected values.

After the consent payload is verified and validated, the SDKs will then automatically update network consent preferences.

## Backward compatibility

The encoded consent payload is an _optional_ parameter when starting a new conversation. Existing conversations will not be affected, and client apps using outdated SDKs will continue to work without updates.

## Security considerations

There are no known negative security implications introduced as a result of collecting a signature from a user and including it as part of a conversation. The contents of the message being signed will be shown to the user beforehand, and the resulting signature is only useful to SDKs connected to the wallet that signed the message.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
