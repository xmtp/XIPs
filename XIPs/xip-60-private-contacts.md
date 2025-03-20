---
xip: 60
title: Private contacts
description: Proposes a way for a client to set a private contact name for an inbox and have the name be interoperable across apps and installations.
author: Naomi Plasterer (@nplasterer)
discussions-to: TBD
status: Draft
type: Standards
category: XRC
created: 2025-03-20
---

## Abstract

Proposes a way for a client to set a private contact name for an inbox that is interoperable across apps and installations.

## Motivation

Instead of requiring each individual app to manage inbox naming, this allows a user to set a name for an inbox they interact with, and have this inbox name displayed across all apps they use.

For example, Alix messages Bo using an XMTP app. If Bo does not have an onchain name associated with their address, Bo will show up in the app as a seemingly random string of characters. This can be confusing for users interacting across apps. This feature enables Alix to set to set a unique contact name for Bo's inbox, such as "Bravo Bo," and have this contact name, instead of the random string, display across all of the apps Alix uses. This private contact name is visible only to Alix and is not visible to anyone else.

## Specification

Similar to [consent](https://docs.xmtp.org/inboxes/user-consent/user-consent) where you can set an `Allowed` or `Denied` state for an `inboxId`, private contacts allow you set a personal name for an `inboxId`.

```kotlin
client.preferences.updateInboxIdName(inboxId, "name")

client.preferences.nameForInboxId(inboxId) // returns a name
client.preferences.namesForInboxIds([inboxId])// returns a map of inboxIds to names
```

Using [history sync](https://docs.xmtp.org/inboxes/history-sync) methods, this will allow the private contact name for the `inboxId` to be interoperable across apps and installations.

```kotlin
client.preferences.streamInboxNames()
```

## Backward compatibility

No backward compatibility issues.

## Security considerations

Because this a personal and private setting, there are no security considerations.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
