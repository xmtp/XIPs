---
xip: 70
title: Local database management tools
description: Proposes tools that enable integrators to manage the local SQLite database.
author: Naomi Plasterer (@nplasterer)
discussions-to: https://community.xmtp.org/t/xip-70-local-database-management-tools/1116
status: Draft
type: Standards
category: XRC
created: 2025-07-30
---

## Abstract

Integrators want the ability to manage the local SQLite database without having to delete the entire database and create a new installation. This may be for displaying local messages that don’t need to go to the network or cleaning up local messages that are taking up device space.

## Specification

### Find a local database

When calling `Client.findLocalDatabase(dbDirectory, inboxId)`,  given an inboxId and an optional dbDirectory. Check to see if an associated encrypted XMTP local DB exists on this device. Can be used to see if a new installation should be created or not.

### Delete a local database

When calling `client.deleteLocalDatabase()`, the local database for the client will be deleted, effectively deleting the installation keys and all the associated data. When calling create client again with the same inboxId, a new installation will be created. We recommend revoking the installation before deleting the local database to avoid dead installations in your inbox.

### Delete all local messages for a conversation

When calling `conversation.deleteMessages(beforeDate, contentType)`, all the messages in the database for this conversation will be deleted before the date specified and of the specific contentType or, if blank, all messages will be deleted. None of these messages will ever be accessible again on this installation. These messages will also not be accessible for archiving and importing into other installations. However, the messages will still exist for other users and installations.

### Delete all local messages for all conversation

When calling `conversations.deleteMessages(beforeDate, contentType, consentState)`, all the messages in the database for all conversations with this consent state will be deleted before the date specified and of the specific contentType or, if blank, all messages will be deleted. None of these messages will ever be accessible again on this installation. These messages will also not be accessible for archiving and importing into other installations. However, the messages will still exist for other users and installations.

### Delete a local message

When calling `conversation.deleteMessage(messageId)`, the message associated with that Id will be deleted from the local database for this installation. However, it will still exist for other users and installations.

### Add a local message

When calling `conversations.addLocalMessage(contentType)`, the encoded content type is added to the local database but is not sent or queued to be sent to the network. This message exists only on this installation and nowhere else. Could be used for showing a temporary local state that could then be deleted. Or for very specific device or application information.

### Delete a conversation

We recommend not deleting conversations, as there is no path to recovering a welcome for this installation in the future. Instead, we recommend deleting all the messages and setting the consent state to `denied` so that the conversation will no longer sync or stream. In the future self removing from the group would also be advised.

## Backward compatibility

N/A

## Security considerations

The only potential security risk would be exposing on a device if another inboxId has a local database on that device. However the user would already have to have access to the device to be able to check to see if that inboxId has a db and would also need to have access to the encryption key of the database to get any information out of it. This is also possible by looking in the local databases of the device anyways so not exposing anything not already possible to find.
There are no other security considerations for local database management because it does not involve other installations or the network.

## **Copyright**

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
