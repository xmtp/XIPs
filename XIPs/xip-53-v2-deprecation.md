---
xip: 53
title: XMTP V2 deprecation
description: This XIP defines a plan to turn off writes to the XMTP V2 network and making it read only to encourage developers to upgrade to using the XMTP V3 network.
author: Naomi Plasterer (@nplasterer)
discussions-to: TBD
status: Draft
type: Standards
category: XRC
created: 2025-01-29
---

## Abstract

XMTP V3 provides the framework for a more robust messaging ecosystem—supporting stronger security guarantees with MLS, modern features like group chats, and decentralization. These enhancements weren’t efficiently and effectively feasible with XMTP V2, which also can’t migrate seamlessly to V3.

To encourage adoption of XMTP V3 and ensure the network remains secure and future-proof, we provide this plan to remove the ability to write to XMTP V2. This step discourages reliance on outdated infrastructure and fosters a unified community transition to the more advanced V3 network.

## Motivation

Now that XMTP V3 is fully featured and developer-ready, it’s the ideal time to move V2 interactions to a more future-proof environment that provides a sustainable, long-term solution for the XMTP community. By transitioning to V3, these interactions can remain stable and continue to compound into the future.

## Specification

**January 1, 2025**: Developers should start upgrading to XMTP V3, moving off any V2-compatible versions of XMTP SDKs. We recommend always updating your app to use the latest version of the SDK to ensure that you'll be on a stable release when it's ready.

**April 1, 2025** - The brown out for XMTP V2 begins. On every Tuesday and Thursday in April 2025 (1, 3, 8, 10, 15, 17, 22, 24, and 29), the XMTP V2 network will be in read-only mode during the following time window:

North America

- 07:00 PM - 11:00 PM PDT
- 08:00 PM - 12:00 AM MDT
- 09:00 PM - 01:00 AM CDT
- 10:00 PM - 02:00 AM EDT

Europe

- 03:00 AM - 07:00 AM BST (next day)
- 04:00 AM - 08:00 AM CEST (next day)

Africa

- 03:00 AM - 07:00 AM WAT (next day)
- 04:00 AM - 08:00 AM CAT/SAST (next day)
- 05:00 AM - 09:00 AM EAT (next day)

Middle East

- 05:00 AM - 09:00 AM AST (next day)
- 05:00 AM - 09:00 AM IDT (next day)
- 06:00 AM - 10:00 AM GST (next day)

South / Central Asia

- 07:00 AM - 11:00 AM PKT (next day)
- 07:30 AM - 11:30 AM IST (next day)
- 08:00 AM - 12:00 PM BDT (next day)
- 09:00 AM - 01:00 PM ICT (next day)

East Asia

- 10:00 AM - 02:00 PM CST (next day)
- 11:00 AM - 03:00 PM JST (next day)

UTC

- 02:00 AM - 06:00 AM UTC (next day)

**May 1, 2025** - At 07:00 PM PDT, XMTP V2 will be permanently set to read-only mode. No more writes to the V2 network will be allowed.

## Backward compatibility

Unfortunately, there is no backward compatibility between XMTP V2 and V3. All conversations and messages sent on V2 won't be accessible on V3.

However, users can still access their V2 messages in a read-only capacity using [legacy.xmtp.chat](https://legacy.xmtp.chat/).

## Reference implementation

[Upgrade to XMTP V3](https://docs.xmtp.org/upgrade-to-v3)

## Security considerations

Identities on XMTP V3 are more secure than on XMTP V2. Upgrade your app to use XMTP V3 to give your users much stronger security guarantees.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
