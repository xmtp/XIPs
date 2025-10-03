---
xip: 66
title: AT Protocol Identity
description: Proposes a way to add an AT Protocol DID as an MemberIdentifir for an InboxID
authors: Chris Boscolo (@ccbscolo)
status: Draft
type: Standards
category: XRC
created: 2025-05-25
---

## Abstract

[XIP-66](https://github.com/xmtp/XIPs/blob/main/XIPs/xip-66-atproto-identity.md) defines a way to add an AT Protocol identity as an associated identity for an XMTP Inbox.

## Motivation

Bluesky has popularized the AT Protocol with over 36M sign-ups and an estimated 2 million daily active users. The AT protocol does not have a broadly adopted  messaging protocol for either direct messages or group messages. Supporting AT Protocols identities in XMTP would enable apps built on the AT Protocol to use XMTP for decentralized messaging.

The goal of this XIP is to enable apps built with AT Protocol, including Bluesky, to adopt XMTP for messaging by associating an AT Protocol account DID as a valid identity connected to an XMTP Inbox ID.

## Specification

### Challenges 

There are two challenges with AT Protocol identities the make it different than either a Passkey or an Ethereum Wallet.

1. An ATProto DID (account) is an [W3C DID](https://atproto.com/specs/did) (eg. `did:plc:bq5ygkxmmbae7n6z34neuaih`). The DID itself may not be self-certifying the way a wallet EOA or public key is. Instead, the DID Document contains the public key designated by the user to authenticate writes to the [Personal Data Store (PDS)](https://atproto.com/guides/data-repos). It's assumed that there is secure way to query the DID Document for the DID. In order to prove control over the AT Protocol identity, client software needs to lookup the DID Document associated with the ATProto DID and read the `#atproto` public key from the `verificationMethod` element, then use this  key to verify signatures of data commited to user's PDS. Similar to Smart Contract Wallet address, verification of signatures cannot be performed offline. One ramification of this, is that an ATProto DID would not be suitable as an `MemberIdentifier` that can add installations (key pairs) as children. An ATProto DID would only serve as an "also known ss" identifier for the XMTP Inbox ID.

2. Due to the nature of the AT Protocol architecture, this public key stored in the `verificationMethod` is not available for adhoc signing of arbitrary content. Instead, it is typically only available within the Personal Data Store (PDS) for signing `commits` in the PDS. This means that signature verification logic will need to be performed over this AT Protocol `commit` record.

### Typical scenarios for AT Protocol identity associations

Due to the challenges identified above, AT Protocol Identities can only be added to XMTP Inbox IDs that have already been created via one of the supported key types. (currently either Passkey or Wallet address.) The associated ATProto DID can be thought of as an "also known as" record for this XMTP Inbox ID instead of a `MemberIdentity` that can manage the XID itself.

The typical scenario for a native AT Protocol app will be to create an XMTP Inbox ID using a Passkey, add this Inbox ID to the ATProto PDS resulting in a signed `commit` that is then used to add the AT Protocol DID as a valid `MemberIdentifier` using the Passkey.

### Attesting to an association with the a particular Inbox

To associate an AT Protocol Identity with an XMTP Inbox ID:

1. Write a record to the PDS using [`com.atproto.repo.putRecord`](https://docs.bsky.app/docs/api/com-atproto-repo-put-record) with `collection` = `org.xmtp.inboxid` and `rkey` as the string `self`. This step can only be performed by the user that controls the ATProto DID and associated PDS.
2. Read the signed commit data from the PDS using [`com.atproto.sync.getRecord`](https://docs.bsky.app/docs/api/com-atproto-sync-get-record). Extract the signature from this commit for use in a call to `AddAssociation`. The `AddAssociation` call must verify that the signature matches the public key in the ATProto DID, and must verify that Inbox ID written with `com.atproto.repo.putRecord` matches this XMTP InboxID being updated.

### Other considerations

### ATProto DID as a Member Identifiers

Due to the [challenges](#challenges) listed above, an ATProto DID as a `MemberIdentifier` will not be allowed to add devices as children. The passkey/wallet that added the ATProto DID would add the device as a sibling to the ATProto identifier.

Note: This XIP defines a new level of permissions for a `MemberIdentiifier` that is not described in [XIP-46](https://github.com/xmtp/XIPs/blob/main/XIPs/xip-46-multi-wallet-identity.md#key-hierarchy-and-permissions).

#### Looking up the AT Protocol ID

[TBD] Need help filling in the DevX for how to know when to show the AT Protocol ID, and how to look up an ATProto identity to initiate messages to them.

#### Human readable names

In AT Protocol, the human readable name for an AT Protocol identity is a DNS name. It can be retrieved from the ATProto DID Document `alsoKnownAs` element.

```json
  "alsoKnownAs": [
    "at://chaosmokey.bsky.social"
  ],
```

## Rationale and alternatives

One alternative not described in this spec is adding the XMTP Inbox ID to the DID Document itself rather than adding it to the ATProto PDS referenced in the ATProto DID. The reason for this is that the developer tooling required to update a user's DID does not exist and even if it existed for `did:plc`, updating a `did:web` DID will probably never exist.

## Backward compatibility

### Compatibility with old versions of LibXMTP

Adding an ATProto `MemberIdentifier` should *not* break compatibility with older version LibXMTP releases due to new `MemberIdentifiers` not being able to sign identity updates, and the graceful handling of new unknown `MemberIdentifiers`.

## Reference implementation

### High-level technical implementation

#### Adding ATProto Indentity support (non-breaking)

- Add a new `MemberIdentifier::ATProto` variant that has restricted permissions. It will not be able to perform any identity updates, nor will it be allowed as the recovery identity.
- [Confirm with **Nick**]Add a new `UnverifiedSignature::ATProto` variant
  - Implement the associated `to_verified` branch logic
- [Confirm with **Nick**] Add a new `SignatureKind::ATProto` variant

This means that the `MemberIdentifier` in the `AddAssociation` proto may come through as `None` in old versions that haven't received the AT Proto update. It must be verified that this behavior is acceptable.

#### Changes to AddAssociation proto

[TBD] Is this needed in the XIP?

```rust
message Association {
  oneof kind {
    :RecoverableEcdsaSignature erc_191 = 1;
    Erc1271Signature erc_1271 = 2;
    LegacyCreateIdentityAssociation legacy_xmtp_identity = 3;
    ATProtoAssociation atproto_identity - 4;
  }
}
```

#### Verify the DID to XMTP Mailbox ID mapping

AT Protocol DIDs are represented as a string in the format `did:method:value`. The two methods currently supported are `did:plc` and `did:web`.

Steps to verify that the DID has authorized the association with the XMTP Inbox ID.

1. Ensure `at://DID/org.xmtp.inbox/self` record exists in the PDS for DID.
1. Ensure the `inboxId` content of the record matches the XMTP Inbox being updated.
1. Compute the CID for this record.
1. Retrieve the commit record for `at://DID/org.xmtp.inbox/self` and verify that the commit contains the record CIS and that the signature is valid for public key in DID.

Example code for performing these steps can be found at [verify-atrecord.ts](https://gist.github.com/cboscolo/ebb84ab7cc3fe8918a9da67b9db187b9)

#### Adding the XMTP Inbox ID to the AT Protocol PDS

[TBD] chrisb will provide sample typescript code for how this is done.

## Security considerations

### Threat model

#### Insecure association types

Because these new association types can be looked up through the API, any flaws in the implementation of signature verification could allow one user to impersonate another. New association types must be vetted with the same level of security review as any other protocol change.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
