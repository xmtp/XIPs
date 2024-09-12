---
xip: 36
title: Frames Support
description: Explores the new tooling required for XMTP apps to render and interact with Frames inside XMTP conversations
author: Nicholas Molnar (@neekolas)
discussions-to: https://community.xmtp.org/t/xip-36-supporting-frames-in-xmtp/534
status: Review
type: Standards
category: Interface
created: 2024-01-31
---

## Abstract

This XIP explores the new tooling required for XMTP apps to render and interact with Frames inside XMTP conversations. The XIP also takes a deep dive into the Farcaster Frames specification and evaluates its compatibility with XMTP.

## Motivation

Developers building with XMTP have been asking for a way to embed generic interactive content into messages for a long time. [XMTP Content Types](../XIPs/xip-5-message-content-types.md) make sense for the head-of-the-curve use cases (such as replies, reactions, and media embeds) where requirements are well known ahead of time, but there is a very long tail of developer demands. Making app devs support hundreds of different content types to handle all those needs would never be a practical solution. We need a “one size fits all” way of enabling the long tail.

We could build a competing protocol that would work for this, but I don’t see why we would create a new standard when one already exists and has traction. The question is: How could we extend Frames to work inside XMTP conversations, and what are the trade-offs?

The goal here is to allow existing Frames developers to reach users in private DM channels outside of Farcaster and in public Farcaster posts, with the minimum amount of code changes for the Frames developers.

## Specification

Three new capabilities are required for client apps to render and interact with Frames:

1. **Rendering**  
Client apps need to be able to render the "initial frame" before any interaction
2. **Interaction**  
Client apps need to be able to interact with Frames, and the HTTP POST requests in those interactions need to include signed content that can irrefutably identify the sender as the holder of an XMTP identity
3. **Verification**  
Frame developers need to be able to read the HTTP POST requests from #2 and verify the signatures, allowing them to provably know who clicked the button

For further reference, see the [Open Frames specification](https://github.com/open-frames/standard), a lightweight extension to the [Frames spec](https://docs.farcaster.xyz/reference/frames/spec) to help enable non-Farcaster apps and protocols to support Frames.

### Rendering

Users already include URLs in standard XMTP `ContentTypeText` messages. Some client apps choose to render link previews for those URLs. Frames would just be an extension of that link preview functionality.

To [render a Frame](https://docs.farcaster.xyz/learn/what-is-farcaster/frames), developers need to be able to render some special HTML meta tags into the UI, similar to how they already render Open Graph tags. This is a typical frame payload:

```html
<meta property="fc:frame" content="vNext" />
<meta property="fc:frame:image" content="http://...image-question.png" />
<meta property="fc:frame:button:1" content="Green" />
<meta property="fc:frame:button:2" content="Purple" />
<meta property="fc:frame:button:3" content="Red" />
<meta property="fc:frame:button:4" content="Blue" />
<meta property="fc:frame:button:4" content="Blue" />
<meta
  property="fc:frame:post_url"
  content="https://my-frame-server.com/api/post"
/>
```

XMTP client app devs don’t need any special help from XMTP to render an existing Farcaster Frame.

The problem is that some Frames will be able to support POST requests from XMTP clients, while others will only be able to receive POSTs from Farcaster clients that include a signed payload with an `fid`.

This XIP proposes that Frames developers add a new meta tag to POSTs to tell clients they can receive XMTP responses.

```html
<meta
  property="xmtp:frame:post-url"
  content="https://my-frame-server.com/api/post/xmtp"
/>
```

For a prototype implementation of a rendering helper library, see this [frames-client](https://github.com/xmtp/xmtp-web/tree/main/packages/frames-client) in the **xmtp-web** GitHub repo.

### Interaction

When a user clicks a button in a Frame, the app POSTs a signed message to the Frame URL, or a different URL specified in the initial Frame using the `post_url` tag.

This is an example Farcaster Frame payload:

```json
{
  "untrustedData": {
    "fid": 2,
    "url": "https://fcpolls.com/polls/1",
    "messageHash": "0xd2b1ddc6c88e865a33cb1a565e0058d757042974",
    "timestamp": 1706243218,
    "network": 1,
    "buttonIndex": 2,
    "castId": {
      "fid": 226,
      "hash": "0xa48dd46161d8e57725f5e26e34ec19c13ff7f3b9"
    }
  },
  "trustedData": {
    "messageBytes": "d2b1ddc6c88e865a33cb1a565e0058d757042974..."
  }
}
```

The `trustedData.messageBytes` is a serialized Protobuf of a signed Farcaster message, with the message payload matching this Protobuf schema:

```protobuf
message FrameActionBody {
  bytes frame_url = 1;    // The URL of the frame app
  bytes button_index = 2; // The index of the button that was clicked
  CastId cast_id = 3;     // The cast which contained the frame URĽ
}

// MessageType and MessageData are extended to support the FrameAction
enum MessageType {
  .....
  MESSAGE_TYPE_FRAME_ACTION = 13;
}

message MessageData {
  oneof body {
    ...
    FrameActionBody frame_action_body = 16
  }
}
```

Developers are expected to call the `validateMessage` API on a hub, which would return a response that validates the signatures on the message.

```json
{
  "valid": true,
  "message": {
    "data": {
      "type": "MESSAGE_TYPE_FRAME_ACTION",
      "fid": 21828,
      "timestamp": 96774342,
      "network": "FARCASTER_NETWORK_MAINNET",
      "frameActionBody": {
        "url": "aHR0cDovL2V4YW1wbGUuY29t",
        "buttonIndex": 1,
        "castId": {
          "fid": 21828,
          "hash": "0x1fd48ddc9d5910046acfa5e1b91d253763e320c3"
        }
      }
    },
    "hash": "0x230a1291ae8e220bf9173d9090716981402bdd3d",
    "hashScheme": "HASH_SCHEME_BLAKE3",
    "signature": "8IyQdIav4cMxFWW3onwfABHHS9IroWer6Lowo16AjL6uZ0rve3TTFhxhhuSOPMTYQ8XsncHc6ca3FUetzALJDA==",
    "signer": "0x196a70ac9847d59e039d0cfcf0cde1adac12f5fb447bb53334d67ab18246306c"
  }
}
```

Other Farcaster APIs can then be used to link the `fid` to a blockchain account, and to retrieve other data from the user’s profile.

There are clearly parts of this flow that are very Farcaster-specific. It references `fid`, `cast_id`, and `network`. I don’t think any of this is a blocker to interoperability, but it will require a little more branching code for developers to support both XMTP and Farcaster Frames.

At a high level, what developers are doing with all this code is validating three things:

1. The incoming POST was from a legitimate button click
2. Which button was clicked
3. Who clicked the button

With this information, the developer then responds with HTML outlining an update to the Frame’s state using the same format as the initial render.

In Jan 2024, Coinbase [released `FrameKit`](https://github.com/coinbase/onchainkit), with some high-level APIs designed to verify Frame POST payloads. Those APIs are `getFrameAccountAddress`, `getFrameMetadata`, and `getFrameValidatedMessage`. XMTP already has all the primitives needed to craft payloads that can enable these same workflows.

We've developed a prototype implementation of a privacy-preserving interaction library. See the [frames-client](https://github.com/xmtp/xmtp-web/tree/main/packages/frames-client) in the **xmtp-web** GitHub repo.

### Verification

With the goal of making things as straightforward for existing Frames devs as possible, here is a proposed interaction payload structure for an XMTP Frame:

```json
{
  "untrustedData": {
    "wallet_address": "0x12345...",
    "url": "https://fcpolls.com/polls/1",
    "timestamp": 1706243218,
    "buttonIndex": 2
  },
  "trustedData": {
    "messageBytes": "d2b1ddc6c88e865a33cb1a565e0058d757042974..."
  }
}
```

The `messageBytes` would be an XMTP-specific Protobuf message that would include the payload and the signature. Something like:

```protobuf
message FrameActionBody {
  string frame_url = 1;
  uint32 button_index = 2;
  uint64 timestamp = 3;
}

message FrameAction {
  Signature signature = 1; // XMTP already has signature types that can be used here
  SignedPublicKeyBundle signed_public_key_bundle = 2; // The SignedPublicKeyBundle of the signer, used to link the XMTP signature with a blockchain account through a chain of signatures.
  bytes action_body = 3; // Serialized FrameActionBody message, so that the signature verification can happen on a byte-perfect representation of the message
}
```

We could choose to add some additional metadata to this payload that would give the Frame developer more context about where the click originated. For example, `message_id` and `conversation_id` come to mind. The tradeoff here is privacy.

All messages on the XMTP network are stored in topics. Topics have an opaque identifier, and only the participants in a conversation know that a given topic is "theirs." Adding the `message_id` or `conversation_id` to the payload would leak that information to the Frame developer, allowing them to track how many messages were sent in a particular conversation. This feels like an unnecessary privacy leak and should be avoided unless there is a _very_ strong need to share this information with the Frame developer.

These payloads are meaningfully different from the Farcaster payloads. We can provide some helper libraries to allow a Frames developer to take the JSON payload above and get back the information required to move forward to the next Frame (`isValid`, `verifiedSenderWalletAddress`, `buttonIndex`). Because XMTP is a private network instead of a public one, the goal should be to include the minimum amount of metadata to make this work.

On the sender side (the person clicking the button), XMTP SDKs already have generic interfaces for signing messages. All we need to do is define the payload format, and any app developer should be able to generate a payload matching this format and transmit it directly to the Frame URL.

The `FrameAction` includes a signature of the `FrameActionBody` encoded as bytes. To verify and recover the wallet address from this payload, a developer must:

1. Recover the public key from the signature
2. Verify that the public key matches the identity key in the `SignedPublicKeyBundle`
3. Recover the wallet address from the signature in the `SignedPublicKeyBundle`

For a prototype implementation of a verification library that does this, see the [frames-validator](https://github.com/xmtp/xmtp-node-js-tools/tree/main/packages/frames-validator) in the **xmtp-node-js-tools** GitHub repo.

## Backward compatibility

- All Frames will be sent using ordinary XMTP text messages.
- Client apps can choose to expand URLs found in these messages into Frames at their discretion.
- No new Content Types are required.
- No new SDK changes are necessary for XMTP SDKs that allow app developers to sign messages with the XMTP identity key.
- The new helper libraries that facilitate Frame rendering, interaction, and verification are strictly opt-in.

## Reference implementations

We've developed reference implementations for all three components required to enable Frames on XMTP:

1. [Rendering/interaction helper library](https://github.com/xmtp/xmtp-web/tree/main/packages/frames-client)  
Needs some updates to accommodate changes to the POST message schema made after development began

2. [POST payload verification helper library](https://github.com/xmtp/xmtp-node-js-tools/tree/main/packages/frames-validator)  
Needs some updates to accommodate changes to the POST message schema made after development began

3. [Open Graph Proxy service](https://github.com/neekolas/og-proxy)  
Still missing support for proxying requests for images. This support will be a hard requirement for launch.

Here are some specifications you might also want to explore as a part of working with these reference implementations:

- [Farcaster Frames specification](https://docs.farcaster.xyz/reference/frames/spec)  
The Frames spec for creating interactive and authenticated experiences on Farcaster, embeddable in any Farcaster client

- [Open Frames specification](https://github.com/open-frames/standard)  
A lightweight extension to the Frames spec to help enable non-Farcaster apps and protocols to support Frames.

## Security considerations

In the Farcaster model of Frames, messages are signed on a server by the app and the server makes the POST request to the Frame URL. This means the Frame app developer only sees requests from the server IP and never the client.

However, Farcaster clients, like Warpcast, download the Frame image directly. This [leaks the IP address of the viewer to the Frame developer](https://twitter.com/danfinlay/status/1752500815200399633?t=1psurRGh-JTii3AHjvUrMg). According to a reply on X, they are "[working on it](https://x.com/dwr/status/1752506807548072140?s=20)."

In the proposed scheme above, messages would be signed and sent directly from the client. Privacy is a hard requirement for any Frames adoption on the XMTP network. Without it, I can create a maliciously crafted Frame that logs IP addresses and send a link to it to an anon account. This would allow me to learn their IP the moment they view the message. We absolutely cannot leak client IP addresses to Frame app developers in either the Rendering or Interaction phase.

This can be solved by having developers route these requests through a proxy server to anonymize the sender. I’ve already started [prototyping what a simple Frame proxy](https://github.com/neekolas/og-proxy) would look like. This proxy server should be used for the initial Frame rendering, downloading of the Frame image, and interacting with POST requests. Client app developers can host their own instance of this open source proxy. I propose that XMTP Labs should run an instance as a public good. Developers can also use this proxy server to privately gather the information needed for link previews, which is a nice added bonus.

At some scale, this becomes challenging. Signal Protocol previously used a proxy for link previews, but because of their massive scale they started getting blocked by popular websites like YouTube and had to [roll the feature back](https://community.signalusers.org/t/beta-feedback-for-the-upcoming-android-4-69-release/16219/4). Having many proxy services instead of a single proxy will help avoid this problem, but at some scale, we will need to reconsider the approach.

### Threat model

While not exhaustive, these are some of the most important potential attacks this system must mitigate:

-
