---
xip: 19
title: Deprecate the Composite Codec
description: Proposal to deprecate the Composite Codec
author: Naomi Plasterer (@nplasterer)
discussions-to: Coming soon
status: Draft
type: Standards Track
category: XRC
created: 2024-01-09
replaces: XIP-9
---

## Abstract

This is a proposal to deprecate the Composite Codec defined by [XIP-9 Composite Content Type](https://github.com/xmtp/XIPs/blob/main/XIPs/xip-9-composite-content-type.md).

This content type was meant to be used for multi-part messages where the parts can be of any content type, and the composite parts can be arbitrarily nested.

## Motivation

Despite its original intent, the Composite Codec’s sole impact on XMTP has been to introduce unnecessary complications for developers.

## Specification

The keywords “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

To deprecate the Composite Codec, it must be removed as a supported standard content type from the XMTP SDKs (iOS, Android, JS, and Flutter).

## Rationale

To date, the XMTP developer community has not seen a standard and compelling use case for using the Composite Codec. People using it have found it confusing and hard to use because it's difficult to provide clear fallback text, given the complexity of the content. For any use that the XMTP Labs core developer team has seen, we recommend using a custom content type instead.

Considering the confusion the content type introduces and the lack of adoption, this proposal recommends deprecation.

## Backward Compatibility

Once the Composite Codec has been deprecated, you can still use it by adding it to your project as a custom content type.

However, we recommend that you check in with the [XMTP Community Forums](https://community.xmtp.org/c/development/ideas/54) first, as the developer community may have since developed a better custom content type or standard to handle your use case.

## Security Considerations

There are no known negative security implications introduced by deprecating the Composite Codec.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/)
