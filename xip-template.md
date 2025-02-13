---
xip: Do not include. The XIP number will be assigned by an XIP editor.
title: Short descriptive title for the XIP, limited to 44 characters. Do not include the XIP number.
description: Description of the XIP, limited to 140 characters. Do not include the XIP number.
author: List each author's name and their GitHub username, email, or ENS domain.
discussions-to: URL where the XIP draft will be discussed.
status: Draft
type: Standards, Process, or Informational.
category: If **type** is `Standards`, select Core, Network, Interface, Storage, or XRC.
created: YYYY-MM-DD
---

Use this template and the guidance in [XIP-0](XIPs/xip-0-purpose-process.md): XIP purpose, process, and guidelines to create an XIP and help it progress efficiently through the review process.

## Abstract

The abstract is a short paragraph that provides a human-readable version of the specification section. A person should be able to read the abstract and get the gist of what the specification does.

## Motivation*

The motivation is critical for XIPs that want to change the XMTP protocol. It should clearly explain why the existing protocol specification is inadequate to address the problem the XIP aims to solve.

The motivation should describe the "why" of the XIP. What problem does it solve? Why should someone want to implement it? What benefit does it provide to the XTMP ecosystem? What use cases does it address?

XIP submissions without sufficient motivation may be rejected outright. *This section is optional if the motivation is evident.

## Specification

The specification should describe the technical syntax and semantics of any new feature. The specification should be detailed enough to enable competing and interoperable implementations for any current XMTP platform.

Follow RFC 2119 for terminology and start the specification section with this paragraph:

The keywords “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

## Rationale

The rationale fleshes out the specification by describing what motivated the design and particular design decisions. The rationale should describe alternate designs that were considered and related work, such as how the feature supports other languages. The rationale may also provide evidence of consensus within the community and should share important objections or concerns raised during those discussions.

## Backward compatibility

All XIPs that introduce backward incompatibilities must include a section describing these incompatibilities and their severity. The XIP must explain how the author proposes to deal with these incompatibilities. XIP submissions without a sufficient backward compatibility treatise may be rejected outright.

## Test cases*

Include tests inline in the XIP as data, such as input/expected output pairs. If the test suite is too large to reasonably include inline, consider adding it as one or more files in `../assets/xip-n/<filename>`, where `n` is to be replaced with the XIP number. *Test cases are optional.

## Reference implementation*

A reference/example implementation that people can use to assist in understanding or implementing this specification. If the implementation is too large to reasonably be included inline, then consider adding it as one or more files in `../assets/xip-n/<filename>`, where `n` is to be replaced with the XIP number. *A reference implementation is optional.

## Security considerations

The security considerations include design decisions, concerns, and implementation-specific guidance and pitfalls that might be important to security discussions about the proposed change. It surfaces threats and risks and how they are being addressed. The information should be useful throughout the proposal's lifecycle.

An XIP cannot proceed to Final status without a discussion of security considerations deemed sufficient by the XIP reviewers. XIP submissions missing security considerations will be rejected outright.

### Threat model

The design must consider and prevent potential attacks from malicious actors, including both XMTP nodes and protocol users. It must address all possible ways that systems and individuals might attempt to exploit or manipulate the system.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
