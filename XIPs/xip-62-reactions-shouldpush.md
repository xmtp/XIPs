---
xip: 62
title: More control over push notifications for reactions
description: Proposes a way to give iOS devs more control over when to send push notifications for reactions.
author: Naomi Plasterer (@nplastere)
discussions-to: TBD
status: Draft
type: Standards
category: XRC
created: 2025-03-24
---

## Abstract

Integrators building XMTP apps on iOS who do not have the entitlement to decrypt messages want more control over push notifications for reactions.

- If someone reacts to a message **you** sent (whether in a 1-to-1 or group chat), you should get a notification
- If someone reacts to a message **not sent by you**, you should not get a notification
- If someone removes a reaction on a message, no one should get a notification

## Motivation

Many integrators building on iOS will not be able to get the push notification entitlement to decrypt messages before they send them. Because of this, XMTP must offer the ability to find out certain information about a push notification before sending it, while also not exposing any information that would expose identifying information about the message.

## Specification

### Protocol

On message send from the protocol, xMTP will need to expose and send the `messageId` and the `referenceMessageId` publicly unencrypted. This should be safe as there is nothing identifying in the `messageId`. This will also require an update to the message protos and node server. This will make the message larger by several bytes.

### Notification server

The notification server will need to keep a database of notifications that it has processed in the past with successful `hmacKeys` matches. If the notification was not sent because the `hmacKeys` were true, store the `messageId`.

On receive of a new message, if `shouldPush` is false, check to see if the `referenceMessageId` is in the local database. If there is a match in the local database, then send the notification. If not, do not send the notification.

The notification server should delete these messages on a rolling basis of 3 or 6 months to keep the database small. This means reactions to older messages may not push.

## Backward compatibility

Messages sent prior to this change and prior to the server database update will not get this functionality.

## Security considerations

Publicly exposing `messageId` and `referenceMessageId` could expose a message that is getting a lot of reactions or replies. However, this information is likely not very useful and people should not be able to triangulate any useful information from it.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
