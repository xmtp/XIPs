---
xip: 56
title: Backups
description: Back up an XMTP installation ID to a file, either to restore on a new device or to provide an archive.
author: Dakota Brink (@codabrink)
discussions-to: TBD
status: Draft
type: Standards
category: XRC
created: 2025-02-19
---

## Abstract

This XIP introduces a way for users to back up their XMTP installation ID to a file, enabling restoration on a new device or archiving for record-keeping. Two types of backups are supported:

- **Hard backup:** Fully restores an installation but takes the preexisting installation that exported the backup offline when restored.
- **Soft backup:** Stores messages and group metadata for archival purposes but requires additional steps to reactivate

Both backup types are encrypted for security, ensuring user data remains private while allowing greater control over installation ID recovery and continuity.

## Motivation

Currently, XMTP does not provide an official way for users to back up and restore their installation IDs, limiting options for device migration, data preservation, and recovery in cases of device loss or failure.

This XIP addresses these limitations by introducing backups, giving users flexibility based on their needs.

Due to the unconventional nature of how MLS groups function, this can get a little tricky with the cryptography of conversations being directly tied to the installation keys on the device. Because of this, we have two backup types: Hard backups and soft backups.

- **Hard backups** provide a full installation restore, enabling seamless recovery on a new device. However, to maintain protocol integrity, restoring a hard backup forces any previous installation offline, preventing forks and ensuring consistency.
  - For example: Alix backed up their installation ID A using device 1. Alix loses access to device 1 and gets a new device 2. Alix can use the hard backup to install installation ID A on device 2. Installation ID A on device 1 is taken offline.
- **Soft backups** allow users to create an encrypted archive of their messages and group metadata, serving as a historical record. While groups are initially non-functional upon restoration, they can be reactivated through non-trivial manual intervention, ensuring message history remains accessible without affecting existing installations.
  - For example: Alix backed up their installation ID A using device 1. Alix can then download their 1:1 and group conversations to a file for archival purposes. Installation ID A on device 1 remains online and fully functional. Alix can use the file to restore installation ID A on device 2 in read-only mode while keeping installation ID A on device 1 online and fully functional. Alix can make installation ID A on device 2 fully functional, but the effort to do so is non-trivial.

By implementing this XIP, XMTP improves data portability and user autonomy, enhancing the overall user experience and trust in the protocol while preserving security constraints inherent to MLS-based messaging.

## Specification

### Hard backups

- Are a direct copy of an installation ID’s entire database.
- Store the messages, cache, intent state…everything…including installation keys. It’s a very straightforward dump.
- Because they export installation keys, hard backups can’t be imported to a new device while also keeping an old device online. No two devices with the same installation keys can be online at the same time. This will cause forks.

> [!WARNING]
> Restoring an installation using a hard backup will cause the old installation to go offline. When a hard backup import finishes, it sends a special message that’s signed with the installation key over the protocol telling all other installations with the same installation keys to go offline. Specifically, all of the pre-existing state data will be deleted, and the existing installation keys will be replaced. For this reason, hard backups are ideally done on a fresh installation.

- Because of all of the factors above, hard backups are installation key backups and are good for restoring an installation ID on a new device if a user loses access to their old phone.
- The upside of hard backups is the user gets functioning conversations right away (after downloading group commit messages from the network), and they do not need a second device/other people to re-add them to conversations.

### Soft backups

- Are **not** a direct copy of an installation ID’s entire database. They do not export installation keys.
- Write groups (with metadata, but without the MLS encryption schemes), messages, consent, and preferences to an encrypted archive.
- When a user restores using soft backups, the conversations that are restored that did not previously exist on the new device are initially read-only and they cannot send messages on them right away.
  - Internally, this will be done by an MLS lookup, not a flag in the database. If the conversation is missing from the MLS group lookup, the conversation is disabled and cannot send messages.
- Once another device on the network adds the user to the conversation or syncs the conversation with them, the conversation is re-enabled, and they can send messages.
- If the user tries to send a message to a read-only conversation, they’ll get an error message telling them that the conversation is read-only and a suggestion that they have an old device or someone in the conversation re-add them to it.
  - App developers can help users avoid this error by not allowing them to send messages in a read-only conversation.
- The upside of soft backups is they separate a user’s messages from their installation keys, which means their old installation can remain online if they restore a soft backup on a new device.

### Both backup types

Both backup types are encrypted with a key the user provides and AES256 GCM. A secret key is required. This can be a password, random bytes, or iCloud keys; it doesn’t matter. Just make sure it’s secret and has enough entropy. The user will just need to provide the same 32 bytes to restore the archive on a different device when they’re ready.

## Rationale

In progress

## Backward compatibility

In progress

## Test cases*

In progress

## Reference implementation*

In progress

## Security considerations

In progress

### Threat model

In progress

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
