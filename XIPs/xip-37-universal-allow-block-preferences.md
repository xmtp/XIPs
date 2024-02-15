# XIP-37: Universal 'allow' and 'block' preferences

| xip                | 37                                         |
|--------------------|--------------------------------------------|
| title              | Universal 'allow' and 'block' preferences  |
| discussions-to     | <https://community.xmtp.org/t/xip-37-universal-allow-and-block-preferences/544> |
| status             | Draft                                      |
| type               | Standards Track                            |
| category           | XRC                                        |
| author             | Saul Carlin (@saulmc), Nick Molnar (@neekolas), Naomi Plasterer (@nplasterer), Ry Racherbaumer (@erygine) |
| created            | 2024-02-14                                 |
| updated            | 2024-02-14                                 |

## Abstract

This XIP establishes 'allow' and 'block' permission preferences, enabling users to explicitly specify which contacts should be able to reach them and which should be blocked across all inbox apps. By respecting these preferences, XMTP inbox apps not only shield users from spam but also give them greater control over their contacts.

*Special thanks to @polmaire for [initiating the discussion](https://github.com/xmtp/XIPs/pull/28/files) that inspired this XIP.*

## Motivation

The ability to 'allow' or 'block' contacts is fundamental for safeguarding users' inboxes in messaging. 'Allow' promotes a conversation from a 'request' or 'invitations' UI component to a 'primary inbox' component, while 'Block' gives users the vital ability to remove spam and other unwanted content from their inbox.

Because XMTP hasn't yet standardized a method for communicating these actions across the network, changing preferences in one app does not affect other inboxes. This results in inbox apps failing to remove unwanted conversations and properly display desired communications.

## Specification

In code we use `consent` to abbreviate "contact permission preferences", and `denied` as the inverse of `allowed`.

- **New Message Topic**: `userpreferences-${identifier}` for encrypted `ConsentList` objects (`type: 'allowed' | 'denied', addresses: [string]`).
- **ConsentState Type**: Introduce `ConsentState = 'allowed' | 'denied' | 'unknown'`.
- **Conversation Field**: Add `consentState` to indicate the consent state of a conversation.
- **APIs**: Introduce APIs for retrieving and managing permission preference lists and states.

## Rationale

This approach will enable apps to accurately reflect users' contact permission preferences by default, thereby shielding them from spam and granting them more ownership and control over their communications.

## Backward Compatibility

Apps must adhere to the logic described below to keep the contact permission preferences on the network synchronized with local app's user preferences, and vice versa.

Update a contact permission preference in the `ConsentList` on the network in the following scenarios only:

- A user explicitly denies a contact. For example, the user blocks, unsubscribes from, or otherwise disables messages for the contact. The app should update the corresponding preference in the network to `denied`.
- A user explicitly allows a contact. For example, the user allows, subscribes to, or otherwise enables messages for the contact. The app should update the corresponding preference in the network to `allowed`.
- An existing conversation has an `unknown` contact permission preference, but a legacy permission in the local database exists. The app should update the corresponding preference in the network to match the legacy local preference.
- An existing conversation has an `unknown` contact permission preference, but has an existing response from the user. The app should update the corresponding preference in the network to `allowed`.

## Test Cases

Test cases will validate the functionality of sending messages using the new message topic and the handling and interpretation of all three permission preferences.

## Reference Implementation

The [reference implementation](https://github.com/xmtp-labs/xmtp-inbox-web/pull/422) in the [XMTP reference client](https://xmtp.chat) demonstrates the integration of contact permission preferences, along with usable code snippets and UI components for allowing and blocking contacts.

## Security Considerations

The `identifier` in the topic is derived from the private key using HKDF and SHA256 to ensure that it cannot be linked back to the user.

### Message Envelope Encryption

1. Generates a new key via HKDF from the user's identity key.
2. Encrypts the message via AES-256-GCM using the derived encryption key and the user's public key as associated data. Then converts it to a `PrivatePreferencesPayload` protobuf containing the ciphertext, nonce, and salt.

### Message Envelope Decryption

1. Decodes the `PrivatePreferencesPayload`.
2. Derives the encryption key via HKDF from the user's identity key.
3. Decrypts the contents via AES-256-GCM using the public key as associated data.

## Copyright

Copyright and related rights waived via CC0.
