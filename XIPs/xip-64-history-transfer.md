---
xip: 64
title: History transfer
description: Proposes a new version of history sync called history transfer that requires more explicit user actions to make syncing more apparent.
author: Naomi Plasterer (@nplasterer)
discussions-to: TBD
status: Draft
type: Standards
category: XRC
created: 2025-04-08
supercedes: 31
---

## Abstract

The initial version of history sync introduced by [XIP-31: Message History request system](xip-31-message-history.md) has worked well but is causing confusion for many integrators because of a lot of things happening automatically.

This version supercedes [XIP-31](xip-31-message-history.md) and:

- Renames the history sync feature to **history transfer**
- Renames the group sync feature to **preference sync**
- Requires more explicit actions to make syncing more apparent

## Specification

### History transfer

History sync is now called **history transfer**.

History transfer will be enabled by default. Integrators who don't want to share their message history with other installations can turn it off. By default, the history transfer server URL will be set to the Ephemera-hosted history server.

History transfer will require several function calls to successfully complete.

For example, given Installation A currently logged in with history and Installation B newly logged in with no history:

1. Installation B must make a request for history by calling `initateHistoryRequest(timeframe)`. This request can include a timeframe so an app can get the message history from the past year or longer. All consent records will always be included.

2. Installation A would have a list of requests for history visible by calling `listHistoryRequests`. This list would show which installation initiated the request as well as the requested timeframe. There is also an option to `streamHistoryRequests` so an app can show requests live whenever they come in from another device. In the background, when syncing the history requests, a job is initiated to add the new installation to all existing conversations, bypassing the 30-minute window.

3. Installation A would then call `prepareHistoryUpload` with the history request, which would return the size of the upload so an app can choose to display the upload time and give the user the option to cancel.

4. Installation A would then call `uploadHistory`. This would initiate an upload to the history server URL with the latest prepared request. It would also send a message letting the sync group know the upload was successful and the upload location. It would return `true` when the upload is successful so the integrator can update the app UI. An app can check progress of the upload by calling `uploadHistoryProgress` which will return a number between 1 and 100, indicating the percentage complete.

5. Installation B would then call `listAvailableHistory` to see a list of history available for download along with the size of the history. Note that history is stored on the server for only 24 hours before being deleted. There is also an option to `streamAvailableHistory` to get a live stream when the history becomes available.

6. Installation B would then call `downloadHistory` which would initiate the download of the history to the local database and return `true` when the download is successful. An app can check progress of the upload by calling `downloadHistoryProgress` which will return a number between 1 and 100, indicating the percentage complete.

### Preference sync

Group sync is now called **preference sync**.

- A preference sync group is created on client creation regardless of whether a history transfer server URL is present.
- To sync preferences between two or more installations, an app can call `syncAllConversations` or an explicit `syncPreferences`.
- Local preferences that can be synced between multiple installations include HMAC keys and consent records.

## Backward compatibility

Integrators who relied on the automatic nature of history transfer will now be required to implement specific UI patterns for users to be able to export and import history between installations.

## Security considerations

### Threat model

Allowing history transfer to be automatic and enabled by default created an attack vector where a malicious actor could create an installation and get message history without the user accepting the request for history.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
