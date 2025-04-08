---
xip: 61
title: Edit and delete messages
description: Proposes a best effort method to delete and edit messages.
author: Naomi Plasterer (@nplasterer)
discussions-to: https://community.xmtp.org/t/xip-61-edit-and-delete-messages/896
status: Draft
type: Standards
category: XRC
created: 2025-03-20
---

## Abstract

This proposes a best effort method to delete and edit messages.

## Motivation

Users want the ability to delete a message they accidentally sent or to delete a harmful message in a group chat. Users also want the ability to edit messages.

## Specification

Given a `messageId`:

- the sender of the message
- OR a super admin or admin of a group (depending on permissions)

can initiate an edit or delete of the message.

When deleting or editing a message, you need to communicate with the rest of your group that the message should be updated. The two options for doing that are:

- An application message via a new Content Type
- OR a commit message that updates group mutable metadata that specifies all of the messages that should be updated for a specific group.

Then, a worker process for each client in the group will update the messages.

The best way forward is to do a new application-level `contentType` called `UpdateMessage`.

This will include both edits and deletes. New people joining a group don’t need to have the `messagesId` of every message ever updated, only ones relevant for messages they see.

```kotlin
const messageUpdate: UpdateMessage = {
  reference: originalMessage.id,
  action: "edited", // or deleted
  updaterInboxId: client.inboxId,
  newContent: "updated text" // optional. Only allow editing of TextCodecs
};
```

These messages will be hidden from the readable messages list, like `ReadReceipts`. And when a new message with the `UpdateMessage` content type is encountered, a worker will ensure the messages are updated.

The message with the `UpdateMessage` content type will be triggered by a client action. Under the hood, the client action will perform the update locally for the initiating client and then post a message with a `contentType` to trigger the worker for others in the group. The worker will also set in the local database on edit to signify that a message was edited and store the `inboxId` of the editor.

This cannot guarantee a delete or edit from any local database being managed by an application separate from the protocol or that a screenshot was not taken prior to delete or edit.

This will also not delete or update the message from the XMTP network nodes. However, messages downloaded from the nodes will never be re-fetched from the nodes again. So a delete or edit from all local databases is nearly equivalent to a delete or edit from the nodes. Also, nodes retain messages for only 6 months.

```kotlin
client.conversations.deleteMessage(messageId) {
    // throws if message cannot be deleted by this client
}

client.conversations.editMessage(messageId, "updated message") {
    // throws if message cannot be edited by this client or is a non-editable content type
}

conversation.updateDeleteMessagePermission(permissionPolicy) {
    // defaults to superAdmin only but can be set to Admin as well
}

conversation.updateEditMessagePermission(permissionPolicy) {
    // defaults to superAdmin only but can be set to Admin as well
}

message.editedBy() // returns inboxId for the person who edited the message
```

## Backward compatibility

Users on versions that do not support editing and deleting messages will not have their messages edited or deleted.

## Security considerations

### Threat model

A malicious group chat super admin could delete or edit valid messages from users.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
