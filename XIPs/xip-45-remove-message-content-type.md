---
xip: 45
title: Remove Message content type
description: Proposal for a content type that provides Remove Message functionality in XMTP
author: Naomi Plasterer (@nplasterer)
discussions-to: https://community.xmtp.org/t/xip-45-remove-message-content-type/630
status: Draft
type: Standards
category: XRC
created: 2024-04-05
---

## Abstract

This is a proposal for an XMTP content type that enables a user to remove a message they sent. The message is removed from all apps that support the content type.

This XIP is inspired by [an idea](https://github.com/orgs/xmtp/discussions/52) originally proposed by Babak (@Babak-gh).

## Motivation

This content type provides functionality that users expect when using a modern messaging app.

## Specification

The keywords “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

This content type enables a user to remove a message they sent. The message is removed from all apps that support the content type.

For example, if a user sends a message and then wants to remove it from view for all message recipients including themself, they can do so. The message will be removed from all apps that support the content type.

The remove message content type functionality:

- Does not remove the message from apps that don't support the remove message content type
- Does not delete the message from the network. It only removes, or hides, the message from view in the app
- Works regardless of whether a recipient has viewed the message.
- We can't enforce this on the protocol but we can recommend integrators take the approach that it works for a limited time only. The sender user must remove the message within 24 hours of sending the message.

Here is the proposed XMTP content type for remove message functionality:

```json
{
  authorityId: "xmtp.org"
  typeId: "delete"
  versionMajor: 0
  versionMinor: 1
}
```

The encoded content MUST have the following parameters:

```json
{
  // The message ID for the message being deleted
  referencing_message_id: string,
}
```

The `referencing_message_id` is used for the message ID.

## Rationale

### Why use a content type?

Using a Standards - XRC content type is a desirable approach as it formalizes the content type within the protocol, making it a recognized and standardized element.

### Why "remove" and not "delete"?

This proposal uses the "remove message" approach vs. a "delete message" approach, meaning it doesn't delete messages from the network. Instead, it removes messages from apps that support the content type.

It takes this approach because a "delete message" or "hard delete" approach would require the user to prove their identity which would compromise privacy.

### Why impose a 24-hour time limit?

This XIP proposes a 24-hour time limit based on providing Signal parity.

- With Signal, a sender has 24 hours after sending to delete a message for everyone.

- With Telegram, a sender can delete a message for everyone at any time.

- With WhatsApp, a sender has two days after sending to delete a message for everyone.

### Why allow removal of viewed messages?

Signal, Telegram, and WhatsApp allow a sender to delete a message even after the message has been viewed by a recipient.

Based on this common functionality, it is a reasonable hypothesis that users expect this behavior.

## Backward compatibility

As a new contentType there shouldn't be any backward compatibility issues. Some clients may not support the new contentType until getting on a new version.

## Test cases

As a user, I want to remove my own message.

As a maintainer, I want to remove someone else's message.

## Reference implementation

From Babak: Here is a simple implementation with a custom content type in [this commit](https://github.com/Babak-gh/xmtp-android/commit/e9a8b57a64609554215619be0dc0533487650c87) developed for the XMTP Android example app.

From Babak: I assume that [previous discussions](https://github.com/orgs/xmtp/discussions/35) about a more specific `content_type` for referring to another message are pending, so I adopted the logic discussed [here](https://github.com/orgs/xmtp/discussions/35).

## Security considerations

No security concerns in a soft delete world. This only becomes a topic when we discuss hard deletes.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
