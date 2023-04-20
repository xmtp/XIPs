# XIP-XX: Universal Consent Layer for XMTP
| XIP                |                                            |
|--------------------|--------------------------------------------|
| Title              | Universal Consent Layer for XMTP           |
| Author             | Pol Maire pol@getconverse.app              |
| Status             | Draft                                      |
| Type               | Standards Track                            |
| Created            | 2023-04-08                                 |
## Abstract
This XIP proposes adding a universal consent layer to the XMTP protocol to prevent spam and allow users to maintain their communication preferences across applications.
## Motivation
Currently, the XMTP network allows anyone to write to anyone without the option to opt-in or opt-out of conversations with other users. Implementing a universal consent layer will provide users with more control over their communication preferences, reduce spam, and enhance privacy.
## Specification
### Consent layers
1. **Opted-in**: The user has explicitly accepted talking with the other user.
2. **Opted-out**: The user has explicitly blocked the other user by clicking on a button in the interface of an XMTP client. Every conversation with the opted-out user is also considered opted-out.
3. **Neither opted-in nor opted-out**: The user received a message from another user but did not send anything nor clicked on any consent button.
### User Interface
- Clients should create a "requests" section in their user interface containing all conversations with users in the "Neither opted-in or opted-out" category.
- Clients can add an additional layer of consent, "Implicitly opted-in":
    - This is not at the protocol level but only a UX guideline at the client level, hence will not be synced between clients
    - The condition for implicit opt-in of a conversation could be that:
        - the user has sent at least one message in the conversation (the client will need to keep syncing messages in the conversation until it reaches the beginning of the conversation or the first message sent by the user)
        - there is a good chance of a positive interaction (e.g.,  having an on-chain transaction with the peer or following the peer on Lens or Farcaster)
### User Settings
- In order to store these consent settings, we would need to have "protocol level user settings" (= user preferences).
    - It could be a specific protected topic `settings-0x.....` that clients can write to using the XMTP Key to store encrypted settings. We could either post the whole settings to the topic everytime the settings change or have some way to store incremental data
    - This would enable to share preferences between multiple clients, and help clients provide a consistent experience rather than building their preferences outside of the XMTP protocol (where switching to another client would make the user lose his preferences)
    - We could all agree on specific "keys" and format to store some data, including consent data.
- The SDKs would have a simple way to retrieve the settings (like `await client.retrieveUserSettings()`) in a JSON format
- We would have a specific key called `consent` in the settings, with a format that could look like:
```
{
  "consent": {
    "version": "1.0.0",
    "peers": {
      "0xa.....": "OPTED_IN",
      "0xb.....": "OPTED_OUT"
    }
  }
}
```
- It means that we trust the clients to not write malicious data to those settings (i.e. automatically Opt In to partners etc). But we already trust clients with our XMTP keys not to send malicious messages from our accounts, so this is probably ok.
### Compliance Requirement
- This XIP is a requirement for compliant clients. Any contact MUST be tagged with one of the three consent statuses.
## Rationale
Introducing a universal consent layer will provide users with more control over their communication preferences, allowing them to avoid unwanted messages and reduce the amount of spam on the XMTP network. Additionally, creating a "requests" section in the UI will help users manage their communication requests more effectively. Allowing clients to add an "Implicitly opted-in" layer at the client level will enable seamless communication with trusted users while maintaining user privacy and control.
## Backwards Compatibility
This XIP does not introduce any significant backwards compatibility issues. Clients that have previously introduced the ability to "block" users locally can migrate to this protocol-level opt-out mechanism.
## Implementation
XMTP clients can start implementing the universal consent layer by incorporating the three consent levels into their existing application logic. Clients should update their user interfaces to include the "requests" section and the additional "Implicitly opted-in" layer at the client level, as suggested in this proposal. The list of opted-out users should be added to the user settings at the protocol level once they are implemented.
## Copyright
This XIP is released under the [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0.html).
