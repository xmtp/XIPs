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

This XIP proposes a new way of managing content types in XMTP in order to make complex content types like reactions, replies, and message filtering easier for XMTP integrators.

## Motivation

During the upgrade from XMTP V2 (Direct Messaging Only) to XMTP V3 (Groups via the MLS protocol), one developer experience improvement was that the new "V3" SDKs manage a local SQLITE database containing all of a user's groups and messages. At the same time, our core "libxmtp" library that manages all the database logic remained completely agnostic to the message "content types" that were being stored in the database. While this separation of content types from the database logic was great for keeping complexity down during initial developement, it has made some quieries that would be common in a production consumer messaging app impossible without forcing developers to implement their own extra local persistent data management. An example of this is when the SDK returnsall message types in order received for a group, how can you efficiently render the emoji reactions, replies and read reciepts for each message in your UI?

In order to address these types of queries, this XIP proposes a way to integrate XMTP content types with our core library and local SQLITE storage.

## Specification

Previously, each XMTP SDK implmented their own ContentType implementations that would aim to serialize and deserialize message contents to the same JSON format. 

This XIP proposes new ContentTypes be defined using protobuf definitions that are integrated into our core rust library. Then binding objects and encoding/decoding functions can be generated for each language all in our libxmtp rust repo. 

<!-- The specification should describe the technical syntax and semantics of any new feature. The specification should be detailed enough to enable competing and interoperable implementations for any current XMTP platform.

Follow RFC 2119 for terminology and start the specification section with this paragraph:

The keywords “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt). -->

## Rationale

Talk about alternative of decoding JSON in rust. 

<!-- The rationale fleshes out the specification by describing what motivated the design and particular design decisions. The rationale should describe alternate designs that were considered and related work, such as how the feature supports other languages. The rationale may also provide evidence of consensus within the community and should share important objections or concerns raised during those discussions. -->

## Backward compatibility

<!-- All XIPs that introduce backward incompatibilities must include a section describing these incompatibilities and their severity. The XIP must explain how the author proposes to deal with these incompatibilities. XIP submissions without a sufficient backward compatibility treatise may be rejected outright. -->

Content types that are implemented in the core library will be treated as new content type versions that will not be automatically supported by older SDK versions. 

## Test cases*

<!-- Include tests inline in the XIP as data, such as input/expected output pairs. If the test suite is too large to reasonably include inline, consider adding it as one or more files in `../assets/xip-n/<filename>`, where `n` is to be replaced with the XIP number. *Test cases are optional. -->

## Reference implementation*

<!-- A reference/example implementation that people can use to assist in understanding or implementing this specification. If the implementation is too large to reasonably be included inline, then consider adding it as one or more files in `../assets/xip-n/<filename>`, where `n` is to be replaced with the XIP number. *A reference implementation is optional. -->

## Security considerations

<!-- The security considerations include design decisions, concerns, and implementation-specific guidance and pitfalls that might be important to security discussions about the proposed change. It surfaces threats and risks and how they are being addressed. The information should be useful throughout the proposal's lifecycle.

An XIP cannot proceed to Final status without a discussion of security considerations deemed sufficient by the XIP reviewers. XIP submissions missing security considerations will be rejected outright. -->

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
