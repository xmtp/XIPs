---
xip: 63
title: MIMI message content format in XMTP
description: Proposal to integrate the More Instant Messaging Interoperability (MIMI) message content format into XMTP
author: Mojtaba Chenani (@mchenani)
status: Draft
discussions-to: https://community.xmtp.org/t/xip-63-mimi-message-content-format-in-xmtp/905
type: Standards
category: XRC
created: 2025-03-21
---

## Abstract

This proposal aims to integrate the More Instant Messaging Interoperability (MIMI) message content format into the XMTP protocol. MIMI defines common content semantics for instant messaging systems, facilitating interoperability and standardization. By adopting MIMI, XMTP can enhance compatibility with other messaging platforms and improve the richness of message content.

To learn more about MIMI, see [More Instant Messaging Interoperability (MIMI) message content](https://datatracker.ietf.org/doc/draft-ietf-mimi-content/).

## Motivation

XMTP currently utilizes its own message content formats, which may limit interoperability with other messaging systems. Integrating the MIMI message content format will:

- Promote standardization across messaging platforms.
- Enhance the expressiveness and versatility of message contents.
- Simplify the development process for applications interacting with multiple messaging protocols.

### Integration into XMTP

To implement MIMI within XMTP, we need to handle the following:

1. **Message encoding**: Use Concise Binary Object Representation (CBOR) to encode message content according to MIMI specifications.
2. **Content types**: Register and define the necessary MIME types for MIMI content in XMTP messages.
3. **Behavioral semantics**: Add support for these MIMI-defined behaviors:
   - **Replies and threads**: Track message threading through the `inReplyTo` field.
   - **Reactions**: Enable message reactions such as likes and emojis.
   - **Edits and deletions**: Enable message editing and deletion with client synchronization.
4. **External content handling**: Create secure systems for referencing and retrieving external content while maintaining end-to-end encryption and integrity.

## Rationale

Adopting the MIMI message content format within XMTP offers several benefits:

- **Interoperability**: Aligns XMTP with emerging standards, facilitating communication with other platforms adopting MIMI.
- **Feature richness**: Enables a broader range of message types and interactions, enhancing user experience.
- **Consistency**: Provides a uniform structure for message contents, simplifying client implementation and reducing potential errors.

## Backward compatibility

Integrating MIMI may introduce compatibility challenges with existing XMTP clients. To mitigate these, XMTP should consider the following:

- **Version negotiation**: Implement a versioning system to allow clients to identify and handle different message formats appropriately.
- **Transitional support**: Maintain support for legacy message formats during a transition period, enabling gradual adoption.
- **Client updates**: Encourage timely updates of XMTP clients to support MIMI, providing clear documentation and support for developers.

## Test cases

TBD

## Reference implementation*

TBD

## Security considerations

TBD

### Threat model

TBD

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
