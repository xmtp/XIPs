---
xip: 53
title: XMTP V2 deprecation
description: This XIP defines a plan to turn off writes to the XMTP V2 network and making it read-only as a way to encourage developers to upgrade to using the XMTP V3 network.
author: Naomi Plasterer (@nplasterer)
discussions-to: https://community.xmtp.org/t/xip-53-xmtp-v2-deprecation-plan/867
status: Draft
type: Standards
category: Core
created: 2025-01-29
---

## Abstract

XMTP V3 provides the framework for a more robust messaging ecosystem—supporting stronger security guarantees with MLS (Messaging Layer Security), modern features like group chats, and decentralization. These enhancements weren’t efficiently and effectively feasible with XMTP V2, which also can’t migrate seamlessly to V3.

To encourage adoption of XMTP V3 and ensure the network remains secure and future-proof, we provide this plan to remove the ability to write to XMTP V2. This step forward discourages reliance on outdated infrastructure and fosters a unified community transition to the more advanced V3 network.

## Motivation

Now that XMTP V3 is fully featured and developer-ready, it’s the ideal time to move V2 interactions to V3, which provides a more sustainable and future-proof solution for the XMTP community. By transitioning to V3, these interactions can remain stable and continue to compound into the future.

## Specification

### January 1, 2025

**Developers should upgrade to XMTP V3**, moving off any V2-compatible versions of the XMTP SDK. We recommend always updating your app to the latest SDK version to ensure you benefit from the most recent stable release.

### May 1, 2025

**The XMTP V2 read-only transition period begins.** On every Tuesday and Thursday in May 2025 (1, 6, 8, 13, 15, 20, 22, 27, and 29), the XMTP V2 network will be in read-only mode during the following times:

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

#### Why a read-only transition period?

The read-only transition period provides a clear alert about the upcoming deprecation of XMTP V2. While the V2 deprecation plan will be communicated widely, the message will inevitably miss some developers. This transition period will provide a more reliable alert to all developers.

This read-only transition period will also help developers identify some of the more nuanced ways in which they're using XMTP V2, but may not be aware of it. For example:

- An app is using a version of the XMTP SDK that includes the `enableV3` flag and the flag is set to `true`. This setting enabled a hybrid V2/V3 version of the SDK for the app and didn't move it to V3 entirely. The app experience will break when XMTP V2 is in read-only mode.

- A developer published an agent/bot using a version of the XMTP SDK that includes the `enableV3` flag set to `true`, and forgot about the agent. The agent experience will break when XMTP V2 is in read-only mode.

### June 23, 2025

**At 07:00 PM PDT, XMTP V2 will be permanently set to read-only mode.** No more writes to the V2 network will be allowed.

## Backward compatibility

Unfortunately, there is no backward compatibility between XMTP V2 and V3. All conversations and messages sent on V2 won't be accessible on V3.

However, users can still access their V2 messages in a read-only capacity using [legacy.xmtp.chat](https://legacy.xmtp.chat/).

## Reference implementation

[Upgrade to XMTP V3](https://docs.xmtp.org/upgrade-to-v3)

## Security considerations

Building upon the already robust security framework of XMTP V2, V3 introduces additional protections that provide even more advanced security guarantees, continuing to keep user communications private and secure.

To learn more, see [Messaging security properties with XMTP](https://docs.xmtp.org/protocol/security).

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
