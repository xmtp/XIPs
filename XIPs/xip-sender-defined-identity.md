---
xip: 
title: Sender Identity Content Type
description: Content type and processing guidelines for sender identity
author: Chris Boscolo
status: Review
type: Standards Track
category: XRC
created: 2023-11-10
---

## Abstract

This XRC proposes a new content type and a set of processing guidelines for sender-defined, recipient-resolved identifiers. It aims to provide the essential information enabling clients to determine the wallet name and optional profile picture of the conversation peer.

## Motivation

One concern for many users is that the current XMTP user experience is confusing due to inconsistent wallet display name rendering across different client apps. Since XMTP as a protocol cares about wallet address (as it should) and displaying the user name is performed by the client (as it should), it can lead to an inconsistent user experience as user interacts with different parts of the web3 ecosystem. Each app has its own method and priority for resolving the wallet address to a user name.

This proposal seeks to solve this by creating a standard way for a user to communicate which web3 name and profile pic is preferred for a given conversation. It also describes how clients should verify the name and pfp specified by the peer is in fact owned by the peer wallet address.

## Specification

Proposed content type:

```js
{
  authorityId: "xmtp.org"
  typeId: "sender-identity"
  versionMajor: 0
  versionMinor: 1
}
```

The message MUST include the following parameters, although either parameter can be an empty string:

```ts
{
  name: string,
  pfpUri: string,
}
```

### Name
A string that contains the peer user's Web3 name. If present, it must be a valid Web3 name whose ownership can be verified onchain.

### pfpUri
The pfpUri contains a URI that resolves to an image that should be used as the sender's pfp. This URI MUST conform to the [Farcaster Canonical URI specification](https://github.com/farcasterxyz/protocol/discussions/72).

The rationale behind using the Farcaster Canonical URI specification is to enable clients to send NFTs from various chains as the pfp in addition to `https` URIs.

### Receiver - Client Processing Guidelines

It is the responsibility of the client while parsing incoming messages to process the `sender-identity` content type. The client is responsible for verifying that authenticity of the identity name and optional pfp sent by the peer. The clients SHOULD display the most recently received name and optional pfp. If no `sender-identity` content type has been sent by a peer, it SHOULD fallback to doing some form of reverse address lookup in order to determine the name of the peer.

#### Name

To determine the display name of a peer, clients SHOULD do the following.

1. Parse the `name` to determine what type of name it is. (ENS/UD/AVVY/other)
1. Perform a forward lookup on this `name` to determine the associated EVM Address. How this forward lookup is performed will depend on what type of name it is.
1. Verify that the EVM address returned by looking up the name matches the conversation `peerAddress`.
   1. If the addresses match, the `name` is considered valid and the client SHOULD display the `name`
   1. If the addresses do not match, the client MUST not display the `name`, and MAY optionally inform the user to be suspicious of this conversation.

Example ENS lookup using viem TS lib.
```ts
    const senderIdentityContent = parseSenderIdentityContent(msg)

    const client = createPublicClient({
      chain: ethChain,
      transport: http(ethApi)
    })

    const address = await client.getEnsAddress({name: senderIdentityContent.name})

   if (address === msg.senderAddress ) {
    // Safe to display name
   }
```

#### pfpUri

The pfpUri contains link to the user's profile pic. If it is an NFT using the `chain` scheme, the client SHOULD verify the address that owns the NFT is the address of the conversation `peerAddress`. The client MAY optionally display the pfp with some indication that it is owned by the peer.

### Sender - Client Procesing guidlines

- Clients SHOULD send the `sender-identity` content in the first message sent to a peer.
- Clients SHOULD send the `sender-identity` content any time the sending users updates their desired name or pfp.
- Clients SHOULD NOT send the `sender-identity` content with every message.
- Clients MAY send messages that only contain the `sender-identity`
- Clients with existing conversations when upgraded to support `sender-identity` MAY send a `sender-identity` on these existing conversations.

### Which client sends identity info

If a user uses multiple different clients, one question that needs to be addressed is which client should be responsible for updating the `sender-identity`. The most ideal way to handle this is for the `sender-identity` to be a user preference that is shared across all clients. There is currently no standard specified for shared user preferences. Once a standard is established for sharing user preferences, clients should adopt this mechanism for agreeing on which `sender-identity` should be used. Until then, clients SHOULD only send `sender-identity` if the user explicitly changes the desired name/pfp except on the first message.

## Questions to resolve (these questions to be removed from the spec)

- I chose to keep this spec as simple as possible and only included `name` and `pfpUri` in the identity content. Should it also include additional identity information, such as real names or other social media profiles?
- For pfpUri, any objections to using the Farcaster Canonical URI spec?
- For the name field, should we keep it a string and require clients to use a web3 name lookup mechanism based on the name, or would it be better to explicitly identify the web3 asset using the Farcaster Canonical URI spec or some other mechanism?
- Will this approach work in the context of Group Messaging?

## Backward compatibility

Clients encountering messages of this type must already be able to deal with messages of an unknown content type, so whatever considerations they're making there should work here too.

## Reference implementation

- [Implementation reference]()
- [Client Usage reference]()

## Security considerations

This approach relies on clients to correctly validate ownership of name and pfp when `chain:`and could lead to spoofing for clients that avoid these additional checks.


## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
