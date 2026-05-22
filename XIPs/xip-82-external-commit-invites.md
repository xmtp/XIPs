---
xip: 82
title: External commit invites
description: Shareable group invites enabling QR-code or link-based joins via atomic MLS External Commits with admin-controlled policy.
author: Tyler Hawkes (@tylerhawkes)
discussions-to: https://community.xmtp.org/t/xip-82-external-commit-invites/
status: Draft
type: Standards
category: Core
created: 2026-05-21
---

## Abstract

XMTP groups currently require an existing online member to add a new participant via a `Welcome`. This XIP introduces **External Commit Invites**: a shareable invite token (suitable for QR codes, deep links, or NFC) that allows a non-member to join a group on their own, without any existing member being online at scan time.

The mechanism uses the MLS External Commits primitive (RFC 9420 §12.4.3.2). The invite token carries a symmetric key and a pointer to an out-of-band service that hosts an encrypted `GroupInfo` for the current epoch. The joiner fetches the blob, decrypts locally, and publishes an atomic commit that adds all of the joiner's installations, registers them in the AppData group membership component, and advances the group epoch — all in a single commit that every existing member validates against an admin-controlled policy.

## Motivation

The dominant onboarding path for XMTP groups today requires an existing member to be online at the moment a new member joins, so they can construct the `Welcome` that initializes the newcomer's MLS state. This is incompatible with high-volume onboarding flows that consumer applications commonly want to ship:

- "Scan this QR code to join the community" posters at events.
- Shareable group-invite links propagated through email, SMS, or social media.
- Self-service "click to join" buttons on websites and within bots.

In each of these cases the admin issues the invite once and then expects subsequent joins to proceed without further admin involvement. Existing alternatives have material drawbacks:

- **Pre-invite manual `Welcome`**: requires an existing member to know the joiner's installations ahead of time and to be online when the joiner accepts.
- **Bot-mediated joining**: introduces a custodial intermediary that must hold group keys.
- **Out-of-protocol "invite codes" backed by a server-side roster**: moves group state outside MLS, defeating the protocol's security guarantees.

External Commits are the MLS-native solution: a non-member with the current-epoch `GroupInfo` can construct a self-contained commit that adds themselves to the group, and existing members validate that commit when they next come online. The remaining design work is to (1) get the `GroupInfo` to the joiner in a way that does not require an existing member to be online, (2) make the commit *atomic* with respect to libxmtp's cross-layer invariants (so existing members do not reject it on receipt), and (3) give the admin runtime-toggleable control over whether the group accepts external commits at all.

## Specification

The keywords "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

### Overview

```text
┌─────────────────────┐                  ┌──────────────────────┐
│  Admin (member)     │                  │  Joiner (non-member) │
└──────────┬──────────┘                  └──────────┬───────────┘
           │                                        │
           │ 1. Generate symmetric key + nonce      │
           │ 2. Export current-epoch GroupInfo      │
           │ 3. Wrap GroupInfo (AEAD)               │
           │                                        │
           │ ExternalInvitePayload (QR / link)      │
           ├───────────────────────────────────────►│
           │                                        │
           │ EncryptedGroupInfoBlob (HTTPS upload)  │
           ▼                                        │
     ┌──────────┐                                   │
     │ External │◄──────────────────────────────────┤  4. Fetch by external_group_id
     │ service  │                                   │  5. Unwrap with symmetric_key
     └──────────┘                                   │  6. Build atomic external commit
                                                    │  7. Publish to XMTP delivery
                                                    │  8. Re-export & re-upload blob
                                                    │
                                                    ▼
                              ┌───────────────────────────────────────┐
                              │  Existing members (when they sync)    │
                              │  validate atomic commit against       │
                              │  EXTERNAL_COMMIT_POLICY + per-component│
                              │  external_committer_permissions       │
                              └───────────────────────────────────────┘
```

### Wire format

Two new protobuf messages are added to `xmtp.mls.message_contents` in [`proto/mls/message_contents/external_invite.proto`](https://github.com/xmtp/proto/pull/334):

```proto
// v1 shape of the shareable invite blob for QR-code or link-based joining
// of an XMTP group via an MLS external commit.
message ExternalInvitePayloadV1 {
  // Application-defined opaque bytes identifying the service location.
  bytes service_pointer = 1;
  // Identifier for the service slot holding the encrypted blob. Format
  // is application-defined (UUID, snowflake, short slot key, etc.) and
  // opaque to libxmtp; the only constraint is that the value is unique
  // within the chosen service. Decoupled from the MLS group_id —
  // rotation may keep this stable (overwrite the same slot) or change
  // it (new slot on the service); the admin chooses per invite.
  //
  // MUST be at least 4 bytes (collision-avoidance floor for tiny
  // services). RECOMMENDED: 16 random bytes when no application-
  // specific scheme is in use. Maximum length is not capped by the
  // protocol; applications should bound it to fit their QR / link
  // transport.
  //
  // After joining, the joiner verifies this matches
  // `EXTERNAL_COMMIT_POLICY.external_group_id` in the group state as
  // defense-in-depth against a stale or swapped QR.
  bytes external_group_id = 2;
  // 32 bytes; ChaCha20Poly1305 key used to wrap the GroupInfo. Matches
  // `EXTERNAL_COMMIT_POLICY.symmetric_key` in the group state.
  bytes symmetric_key = 3;
}

// Versioned envelope for the shareable invite blob. The application embeds
// the serialized bytes in whatever transport it prefers (hex, base64, raw
// QR, NFC, etc.) and stores the corresponding EncryptedGroupInfoBlob on an
// external service keyed by the v1 payload's `external_group_id`.
//
// New wire-format variants are added as new oneof entries; readers that
// don't recognize a variant treat the invite as unparseable and fail
// closed (no implicit downgrade).
message ExternalInvitePayload {
  oneof version {
    ExternalInvitePayloadV1 v1 = 1;
  }
}

// v1 shape of the encrypted-GroupInfo envelope.
//
// `epoch` and `group_state_hash` are plaintext metadata serving two
// distinct purposes:
//
//   * `epoch` provides a total ordering on uploads. The service accepts
//     an upload iff `upload.epoch > current.epoch` (strictly newer);
//     lower-epoch uploads are stale and rejected outright.
//
//   * `group_state_hash` is a consistency check at a single epoch. MLS
//     is deterministic — every member that applies the same commit
//     derives identical group state — so two correct uploads at the
//     same epoch MUST carry the same hash. When `upload.epoch ==
//     current.epoch`: equal hashes mean an idempotent re-upload (no-op
//     or duplicate-reject); different hashes mean the uploaders are on
//     forked views of the group and the service must refuse to pick a
//     winner.
//
// The joiner additionally verifies on download that the blob's `epoch`
// and `group_state_hash` match the decrypted GroupInfo before
// attempting to join — closes the "malicious service swapped
// ciphertext" gap.
message EncryptedGroupInfoBlobV1 {
  // 12 bytes; ChaCha20Poly1305 nonce specific to this ciphertext.
  bytes nonce = 1;
  // wrap_payload_symmetric output: AEAD ciphertext over the serialized
  // MlsMessageOut(GroupInfo).
  bytes ciphertext = 2;
  // MLS group epoch of the wrapped GroupInfo. Plaintext; the service
  // totally orders uploads by this value — strictly-newer wins, stale
  // is rejected. Joiner verifies against the decrypted GroupInfo
  // before joining.
  uint64 epoch = 3;
  // Tree-hash (or equivalent group-state digest) of the wrapped
  // GroupInfo. Plaintext; the service uses this only at equal epochs
  // to detect forks (same epoch + differing hash = forked uploaders).
  // Not used for ordering. Joiner verifies against the decrypted
  // GroupInfo before joining.
  bytes group_state_hash = 4;
  // Wall-clock expiry of this blob, in nanoseconds since UNIX epoch.
  // 0 means no expiry. The service uses this as a TTL hint and MAY
  // garbage-collect blobs past their `expires_at_ns` autonomously.
  // The joining client also enforces this — refuses to join from an
  // expired blob even if the service is still serving it. Admin
  // bounds the campaign by setting this at upload time; extending an
  // invite is a re-upload with a later value.
  uint64 expires_at_ns = 5;
}

// Versioned envelope wrapping a single GroupInfo TLS-serialized bytes
// under an AEAD scheme (ChaCha20Poly1305 in v1) with a fresh nonce per
// re-encryption. Stored on the external service and replaced by joiners
// (with a fresh nonce) after each successful join.
//
// New variants represent breaking wire-format changes (different AEAD,
// different metadata layout). Readers that don't recognize a variant
// fail closed — the joiner cannot attempt MLS state transitions against
// a blob it can't validate.
message EncryptedGroupInfoBlob {
  oneof version {
    EncryptedGroupInfoBlobV1 v1 = 1;
  }
}
```

`ExternalInvitePayload` is the **capability**. It is small (well under 100 bytes), suitable for QR codes, NFC tags, and shareable URLs. It MUST be transported out-of-band; the service that hosts the encrypted blob MUST NOT see it.

`EncryptedGroupInfoBlob` is the **encrypted MLS state**. It is large (typically KB to MB, scaling with group size) and stored on the service indexed by `external_group_id`. Because it is symmetrically encrypted under the payload's `symmetric_key`, the service hosting it learns nothing about the group contents.

### Admin-controlled policy

External Commits are off by default. Each group MUST opt in via a new well-known AppData component, `EXTERNAL_COMMIT_POLICY` (ComponentId `0x800C`), defined in [`proto/mls/message_contents/external_commit_policy.proto`](https://github.com/xmtp/proto/pull/334):

```proto
// Field-coupling invariants enforced by libxmtp when applying an
// AppDataUpdate(EXTERNAL_COMMIT_POLICY) proposal:
//
//   * When `allow_external_commit` transitions to true: `symmetric_key`
//     and `external_group_id` MUST be populated (non-empty, meeting
//     their length requirements) in the same proposal. The two
//     transitions are atomic — there is no window where the bit is on
//     but the invite coordinates are unset.
//
//   * When `allow_external_commit` transitions to false (revoke):
//     `symmetric_key` and `external_group_id` MUST be cleared (set to
//     empty bytes) in the same proposal. Leaving stale coordinates in
//     the group state after revoke would let a future re-enable
//     accidentally revive a previously-distributed key.
//
//   * On re-enable (false → true after a prior revoke): the new
//     `symmetric_key` MUST differ from every previously-used value for
//     this group, and the new `external_group_id` SHOULD differ as
//     well. Reusing a revoked key would re-validate every QR ever
//     printed under that key, defeating the revocation. Admin clients
//     are responsible for generating fresh material on each enable.
message ExternalCommitPolicyV1 {
  // Master switch for MLS External Commits adding new members.
  // Required for the QR-invite flow. Defaults to false; admins
  // (super-admin by default) opt in via
  // AppDataUpdate(EXTERNAL_COMMIT_POLICY).
  //
  // See the field-coupling invariants in the message-level comment
  // above: enabling MUST populate symmetric_key + external_group_id;
  // revoking (true → false) MUST clear them.
  bool allow_external_commit = 1;
  // Wall-clock auto-disable timestamp (ns since UNIX epoch).
  // 0 = no automatic expiry. After this timestamp the validator
  // rejects all external commits regardless of `allow_external_commit`.
  // Lets admins issue time-bounded invite campaigns without having to
  // come back and flip the bit manually.
  uint64 expires_at_ns = 2;
  // Maximum staleness of the GroupInfo referenced by an external
  // commit, in nanoseconds since GroupInfo export. 0 = no staleness
  // limit. External commits whose referenced GroupInfo was exported
  // more than `expire_in_ns` ago are rejected. Narrows the replay
  // window for stolen-blob attacks and forces re-export frequency.
  uint64 expire_in_ns = 3;
  // 32-byte ChaCha20Poly1305 key used to wrap the EncryptedGroupInfoBlob
  // for the currently-active invite. Carried in the group state so any
  // member (especially a just-joined external committer) can re-export
  // GroupInfo and re-upload a refreshed blob under the same key after a
  // join — without this, a printed QR / link would die the moment the
  // issuing admin went offline.
  //
  // The QR carries the same key bytes. Rotation = admin sets a new value
  // here in a single AppDataUpdate(EXTERNAL_COMMIT_POLICY) proposal AND
  // issues a new QR carrying the matching key; old QR holders' keys no
  // longer decrypt blobs the service serves under the rotated slot.
  //
  // Length MUST be exactly 32 bytes when populated. Empty (zero-length)
  // means no active invite — and MUST coincide with
  // `allow_external_commit == false` (see the field-coupling invariants
  // at the top of this message). Revoking the invite MUST clear this
  // field; re-enabling MUST populate it with a freshly-generated value
  // distinct from any previously-used key for this group.
  //
  // Note: the service_pointer (where the blob lives) is intentionally
  // NOT stored in the group. It is per-QR application-defined opaque
  // bytes; different invites for the same group may point at different
  // services. Joiners use the service_pointer from the QR they scanned.
  bytes symmetric_key = 4;
  // Identifier for the service slot holding the active invite's
  // encrypted blob. Application-defined opaque bytes (UUID, snowflake,
  // short slot key, etc.); decoupled from the MLS group_id. Admins
  // MAY rotate the symmetric_key while keeping this stable (overwrite
  // the same slot on the service) or change both together (new slot,
  // leaves the old slot orphaned for application-side GC).
  //
  // The QR carries the same value. The joiner verifies that the QR's
  // `external_group_id` equals this field after joining, as
  // defense-in-depth against a stale or swapped QR. Mismatch indicates
  // the admin rotated to a new slot after the QR was minted; the
  // joining client SHOULD treat the just-published commit as orphaned
  // (it validates fine, but the refreshed blob the joiner would upload
  // to the old slot will not be reachable by holders of the new QR).
  //
  // MUST be at least 4 bytes when populated (collision-avoidance floor
  // for tiny services). RECOMMENDED: 16 random bytes when no
  // application-specific scheme is in use. Empty (zero-length) means
  // no active invite — and MUST coincide with
  // `allow_external_commit == false` (see the field-coupling
  // invariants at the top of this message). Revoking the invite MUST
  // clear this field; re-enabling SHOULD use a freshly-generated value
  // (reusing a prior `external_group_id` is permitted only when the
  // admin intends to overwrite the old service slot — typically the
  // admin generates a new value to leave the prior slot orphaned).
  bytes external_group_id = 5;
}

// Versioned envelope. New variants are added as new oneof variants;
// readers that don't recognize a variant treat the policy as default
// (all fields zero) per the standard unknown-variant tolerance rules.
message ExternalCommitPolicyEntry {
  oneof version {
    ExternalCommitPolicyV1 v1 = 1;
  }
}
```

Toggling the master switch is performed via an `AppDataUpdate(EXTERNAL_COMMIT_POLICY)` proposal. The component's update authorization is governed by its own `ComponentMetadata.permissions` block — by default, super-admin-only.

### Why the symmetric key is stored in the group

The QR / link must remain valid across epochs — a printed poster cannot rotate its key every time a new member joins. This means every successful join MUST re-upload a refreshed `EncryptedGroupInfoBlob` under the **same** symmetric key, even when the admin who issued the invite is offline.

The natural party to do this is the just-joined external committer: they have the new-epoch `GroupInfo` (they just produced the commit) and they have the AppData (the `AppDataDictionary` rides on the `GroupInfo` as a group-context extension, so the joiner reads `EXTERNAL_COMMIT_POLICY` the moment they decrypt the blob). They therefore have everything required to re-export and re-upload.

Storing `symmetric_key` and `external_group_id` in `ExternalCommitPolicyV1` rather than relying on the QR alone gives:

- **Group-wide agreement on the active invite coordinates**. All members see the same key + slot id via normal group sync; no key-distribution side channel.
- **Atomic invite issuance**. The admin opens an invite by setting `allow_external_commit = true`, `symmetric_key`, and `external_group_id` in a single `AppDataUpdate(EXTERNAL_COMMIT_POLICY)` proposal. The fields are coupled by MLS atomicity guarantees — there is no window where the switch is on but the key or slot id is unset.
- **Rotation = single AppData update**. Admin issues a new QR with a fresh key (and optionally a fresh `external_group_id`) and submits an `AppDataUpdate` carrying the matching values. Two rotation flavors:
  - Same `external_group_id`, new `symmetric_key`: re-uploads land on the *same* service slot; old QR holders fetch the rotated blob and fail AEAD on their stale key.
  - New `external_group_id`, new `symmetric_key`: re-uploads land on a *new* service slot; the old slot is orphaned for application-side GC. Useful when the admin wants to migrate the slot for any reason (abuse mitigation, service change, etc.).
- **Revocation = single bit flip**. Setting `allow_external_commit = false` short-circuits the validator regardless of whether the key field is still populated — no blob upload required.

The `service_pointer` is intentionally NOT stored in the group. It is per-QR application-defined opaque bytes; different invites for the same group MAY point at different services (geographic distribution, application migration, etc.). Each scanner-turned-joiner uses the `service_pointer` from the QR they scanned. Only the `symmetric_key` and `external_group_id` need to be group-wide because all participants in the invite lifecycle must produce blobs decryptable under the same value and addressable at the same slot.

#### Leakage analysis

The symmetric key is plaintext within the group context. This is intentional and bounded:

- The key is only useful to an attacker who *also* knows where to fetch the blob (the `service_pointer` is not in group state).
- Any current member already has full read access to all group state, including the ability to export `GroupInfo` directly. Storing the invite key in the group does not increase any current member's capabilities.
- The blob the key wraps contains an MLS `GroupInfo` for the *current* epoch only — not historical messages. A compromised key permits joining the group (which `allow_external_commit` and `external_committer_permissions` already gate), not retroactive decryption.

### Per-component external-committer permissions

`ComponentMetadata` (in [`proto/mls/message_contents/component_permissions.proto`](https://github.com/xmtp/proto/pull/334)) gains a new field:

```proto
message ComponentMetadata {
  ComponentType component_type = 1;
  ComponentPermissions permissions = 2;
  // NEW: Permission policies evaluated against MLS External Commits.
  // Absent / unset is equivalent to all-Deny.
  ComponentPermissions external_committer_permissions = 3;
}
```

This is the per-component declarative authorization layer. When an external committer's commit proposes to modify a component's value, the validator consults that component's `external_committer_permissions` block. If absent, the modification is denied. This is the symmetric twin of the existing `permissions` field, but evaluated against external committers (Sender = `NewMemberCommit`) rather than existing members (Sender = `Member`).

The two layers compose: `EXTERNAL_COMMIT_POLICY.allow_external_commit` is the master switch (runtime-toggleable); `external_committer_permissions` is the declarative per-component capability surface. **Both** layers MUST admit a commit for it to be accepted.

### Atomic external commit shape

An external commit accepted under this XIP MUST consist of:

1. Exactly one `ExternalInit` proposal (RFC 9420 §12.4.3.2).
2. Zero or more by-value `Add` proposals, where every added `KeyPackage` carries the same `inbox_id` as the joiner's signing key. (This enforces "the joiner can add only their own installations.")
3. Exactly one `AppDataUpdate` proposal scoped to the joiner's own entry in the `GROUP_MEMBERSHIP` component. (This keeps the tree-level MLS membership and the AppData-level membership coupled in a single atomic commit — required by libxmtp's cross-layer invariants.)
4. Zero or more PSK proposals.

The following are explicitly forbidden:

- Any by-reference proposal (RFC 9420 §12.4.3.2 already forbids these for external commits; the libxmtp validator hard-rejects).
- `Remove` proposals (no "resync" flavor in v1).
- `GroupContextExtensions` proposals (the AppData migration eliminates the legacy mutable-metadata use case).
- `AppDataUpdate` proposals touching any inbox's entry other than the joiner's own, or any component other than `GROUP_MEMBERSHIP`.
- Multiple `ExternalInit` proposals.

The joiner publishes the commit to the group's XMTP delivery topic, HPKE-wraps `Welcome` messages for the joiner's non-primary installations, then re-exports a `GroupInfo` at the new epoch, wraps it under the same `symmetric_key` with a **fresh** ChaCha20Poly1305 nonce, and uploads the refreshed blob to the service.

### Service contract

The service hosting `EncryptedGroupInfoBlob` is application-defined and out of scope for libxmtp. The protocol REQUIRES of any conformant service implementation:

1. **Indexed by `external_group_id`.** Each invite has its own service slot, identified by the application-defined `external_group_id` (opaque bytes, MUST be ≥4 bytes, RECOMMENDED 16 random bytes) carried in the QR. Re-uploads at the same `external_group_id` overwrite per the rules below; rotating the `external_group_id` orphans the prior slot for application-side GC.
2. **Total ordering by epoch.** Accept `upload` iff `upload.epoch > current.epoch`. Reject stale (`<`).
3. **Fork rejection at equal epoch.** If `upload.epoch == current.epoch && upload.group_state_hash != current.group_state_hash`, reject the upload (one of the uploaders is on a forked view of the group state).
4. **Idempotent re-upload at equal epoch.** If `upload.epoch == current.epoch && upload.group_state_hash == current.group_state_hash`, treat as idempotent (no-op or duplicate-rejection are both acceptable).
5. **Expiry-based garbage collection.** The service MAY delete blobs whose `expires_at_ns` has passed.

The service MUST NOT see the symmetric key. The service MAY apply its own access controls (rate limiting, abuse detection, etc.) but those are outside this XIP.

### Receive-side validation (existing members)

When an existing member processes an external commit, libxmtp dispatches to a new `ValidatedCommit::from_external_commit` path. The validation in addition to the standard MLS commit checks asserts:

1. The sender is `Sender::NewMemberCommit`.
2. Exactly one `ExternalInit` proposal is present.
3. All `Add` proposals share the joiner's `inbox_id` (verified against the joiner's signing key).
4. Exactly one `AppDataUpdate` proposal exists, modifying only the joiner's `GROUP_MEMBERSHIP` entry.
5. No forbidden proposal types are present (see "Atomic external commit shape" above).
6. The group's `EXTERNAL_COMMIT_POLICY.allow_external_commit` is `true`.
7. The current time has not exceeded `EXTERNAL_COMMIT_POLICY.expires_at_ns` (if set).
8. The proposed `AppDataUpdate` is admitted by the `GROUP_MEMBERSHIP` component's `external_committer_permissions` block.

Any failure causes the commit to be rejected before merge. Existing members do not advance epoch on a rejected external commit.

### Join-side flow

A non-member with an `ExternalInvitePayload` and an `EncryptedGroupInfoBlob` performs the following:

1. Verify `blob.version` and `payload.version` are recognized; otherwise fail closed (no implicit downgrade).
2. If `blob.expires_at_ns != 0 && now_ns >= blob.expires_at_ns`, reject (expired).
3. Unwrap `blob.ciphertext` under `payload.symmetric_key` with `blob.nonce`. AEAD failure (wrong key, tampered ciphertext) MUST be a hard reject.
4. Parse the unwrapped bytes as a `VerifiableGroupInfo`.
5. After the commit lands, read the freshly-synced `EXTERNAL_COMMIT_POLICY` component and verify `EXTERNAL_COMMIT_POLICY.external_group_id == payload.external_group_id`. Mismatch indicates a stale QR (admin rotated to a new slot); the just-published commit validates fine but the joiner SHOULD NOT proceed to upload a refreshed blob (it would land on an orphaned slot unreachable by current QR holders).
6. Verify `verifiable_group_info.epoch == blob.epoch` and the group state hash matches.
7. Build the atomic external commit (shape above). The joiner's `KeyPackage`s for all installations are fetched via the standard identity-update flow.
8. Publish the commit + Welcomes.
9. Read `EXTERNAL_COMMIT_POLICY.symmetric_key` from the freshly-merged group state. Re-export `GroupInfo` at the new epoch, wrap under that key with a fresh nonce, and upload the refreshed `EncryptedGroupInfoBlob` to the `service_pointer` from the QR. The next scanner who reaches this service slot gets a current-epoch blob.

If the joiner's QR carries a `symmetric_key` or `external_group_id` that disagrees with the corresponding field in `EXTERNAL_COMMIT_POLICY`, the QR is stale (the admin has rotated since it was minted). The joiner SHOULD treat this as an aborted join — the commit they're about to publish may still validate, but the blob they would upload could not be reached or decrypted by holders of the new QR.

### Rotation and revocation

There is exactly one live invite per group at any time. To rotate, the admin issues an `AppDataUpdate(EXTERNAL_COMMIT_POLICY)` proposal with a fresh `symmetric_key` value (and optionally a fresh `external_group_id`) AND prints / distributes a new QR carrying the matching values. Holders of the prior QR retain stale values and can no longer participate in the new invite. No explicit service-side "revoke" call is required.

The admin chooses per rotation whether to retain the `external_group_id` (overwrite the same service slot — operationally simpler) or generate a new one (new slot, leaves the old slot orphaned for application-side GC — useful when the admin wants to actively abandon a compromised slot).

The `EXTERNAL_COMMIT_POLICY.allow_external_commit` master switch provides a separate, runtime-toggleable revocation path that does not require minting a new QR: the admin flips the bit to `false`, and existing members reject any subsequent external commit regardless of whether scanners can still decrypt stale blobs. This is the recommended "kill switch" for incident response.

### Lifecycle invariants

Three field-coupling rules MUST be enforced on every `AppDataUpdate(EXTERNAL_COMMIT_POLICY)` proposal. Validators reject any proposal that violates them; libxmtp's high-level setter APIs are responsible for never producing such a proposal:

- **Enable atomicity**: When `allow_external_commit` transitions to `true`, the proposal MUST also populate `symmetric_key` (exactly 32 bytes) and `external_group_id` (at least 4 bytes). There is no group state in which the master switch is on but the invite coordinates are absent.
- **Revoke atomicity**: When `allow_external_commit` transitions to `false`, the proposal MUST also clear `symmetric_key` and `external_group_id` (both set to empty). Stale coordinates left behind a revoke would let a future re-enable accidentally revive a previously-distributed key.
- **No-key-revival on re-enable**: When the policy was previously revoked and is being re-enabled, the new `symmetric_key` MUST differ from every previously-used value for this group. (`external_group_id` SHOULD also differ; reusing it is permitted when the admin intends to overwrite the prior service slot.) The admin client is responsible for generating fresh material on each enable; libxmtp's setter helper refuses to accept a `symmetric_key` value the group has used before.

Together these rules ensure revocation is durable: once the admin flips the bit to `false`, no surviving QR — even one that was live moments earlier — can be used to join the group, and no subsequent enable can quietly reinstate a leaked key.

## Rationale

### Why atomic, not fast-follow

libxmtp validates every commit against a cross-layer invariant: tree-level membership (MLS leaves) and AppData-level group membership must be coupled within a single commit. A "single-leaf external commit, then a fast-follow regular commit to register installations in AppData" approach is not viable — the external commit itself would be rejected by every existing member at validation time. The atomic shape is the only design that satisfies libxmtp's existing receive-side validators.

### Why the encrypted blob lives off-protocol

The blob is large and ephemeral: it carries the full ratchet tree of the current epoch and is replaced after every join. Hosting it on the XMTP delivery layer would couple invite UX to the delivery layer's storage characteristics and would require senders to know the topic at invite-creation time. A dedicated service indexed by an opaque application-defined `external_group_id` lets the application choose its own transport, identifier format, and lifecycle policy without coupling any of those to XMTP.

### Why two layers of policy

A single boolean ("allow external commits" on the group permissions) cannot express "external committers may add themselves to `GROUP_MEMBERSHIP` but MUST NOT rename the group via `GROUP_NAME`." Per-component permissions are required, and the AppData component registry already provides the right surface — the `external_committer_permissions` block is the natural symmetric twin of the existing `permissions` block. (`ADMIN_LIST` is a degenerate case here: external committers join as ordinary members and aren't admins by default, so admin promotion is already gated by the existing super-admin requirement on that component — `GROUP_NAME` is the more illustrative example because it's the kind of content-affecting field an external committer might plausibly attempt to write.)

However, per-component permissions alone are not sufficient: a misconfigured component permissions block could accidentally enable external commits the admin never intended. The master switch (`EXTERNAL_COMMIT_POLICY.allow_external_commit`) is a defense-in-depth gate that the admin explicitly toggles. A buggy permissions migration cannot enable external commits behind the admin's back.

### Why ordering by epoch, not by hash

Epoch is a monotonic counter with a total order. Hashes are equality checks at a single epoch. Conflating them invites bugs where the service silently accepts forked uploads or rejects legitimate ones.

### Why the service holds ciphertext, not the QR

A QR code cannot fit a full MLS `GroupInfo` for any non-trivial group. The QR is the *capability* (~50 bytes); the *state* lives at a service that the application chooses. The QR-as-capability + service-as-storage split is the only design that keeps invites human-shareable.

### Alternatives considered

- **Encrypt the blob to the joiner's `KeyPackage` instead of a shared symmetric key.** Requires the admin to know the joiner ahead of time, defeating the purpose.
- **Sign the invite payload.** Considered for future versions; v1 relies on the AEAD authentication of the blob plus the `external_group_id` post-join correlation check.
- **Derive the service slot key from `group_id` (e.g., as a hash) instead of an application-defined `external_group_id`.** Replaced because (a) AEAD already prevents the "service swaps in a different group's blob" attack — a swapped blob fails the unwrap, no extra binding needed; (b) decoupling slot identity from group identity lets admins rotate the slot without rotating the group; and (c) letting the application choose the identifier length and format (tiny services can use a few bytes; larger services can use UUIDs or longer schemes) keeps QR density flexible.
- **Per-epoch key rotation.** A QR cannot rotate keys after print without a server-side derivation scheme that defeats "service holds ciphertext only." Deferred.
- **Resync flavor (`Remove` + `Add` self).** Useful for recovering installations that have been removed; deferred to a follow-on XIP. v1 rejects all `Remove` proposals in external commits.

## Backward compatibility

This XIP is additive. Behavior of existing groups is unchanged unless the admin explicitly enables external commits.

- **Older clients receiving an external commit**: existing members validate via the new `from_external_commit` path. Clients on an older libxmtp version reject the commit (fail-closed). This is the desired behavior — older clients cannot reason about the new policy fields and must not silently accept commits they can't validate.
- **Older clients in a group whose admin enabled external commits**: the policy component is opaque to them. They reject the resulting external commits (fail-closed) but otherwise function normally; they do not become forked. Once upgraded, they pick up the new validation path and the previously rejected commits can be processed.
- **Proto changes**: all additions are optional fields and new well-known component IDs. No existing wire format is altered.
- **Migration dependency**: External commits are gated on the AppData migration being complete for the target group. Pre-migration groups MUST NOT accept external commits — the `GROUP_MEMBERSHIP` component does not exist in the legacy `mutable_metadata` extension and the atomic-shape requirement cannot be satisfied.

## Test cases

The reference implementation includes the following test cases:

1. **Happy path, single-installation joiner**: admin creates invite, joiner scans + joins, all members converge on the new epoch.
2. **Multi-installation joiner**: joiner has 3 installations; primary joins via external commit (with by-value Adds for the other two), secondaries join via Welcome.
3. **Master switch off**: external commit is rejected by every existing member when `allow_external_commit == false`.
4. **Stale GroupInfo**: invite produced at epoch N, group advances to N+1, the joiner's commit attempt at the old epoch fails until a refreshed blob is fetched.
5. **Admin rotation**: admin issues a fresh invite (new symmetric key); the old key no longer decrypts the new blob.
6. **Tampered blob**: blob with mutated ciphertext fails AEAD unwrap; joiner aborts.
7. **Stale-QR rotation**: admin rotates `external_group_id` to a new slot. Holders of the old QR fetch from the old (now-orphaned or admin-deleted) slot and either get nothing or get a stale blob; the joiner aborts on post-join mismatch between QR and component.
8. **Expired blob**: blob whose `expires_at_ns` is in the past is refused by the joiner.
9. **External committer attempts to rename the group via `GROUP_NAME`**: rejected (no `external_committer_permissions` populated on `GROUP_NAME`; defaults to all-Deny).
10. **External committer attempts to add a `KeyPackage` for a different `inbox_id`**: rejected at validator.

## Reference implementation

libxmtp:

- [#3664](https://github.com/xmtp/libxmtp/pull/3664) — Generic `IntentKind::AppDataUpdate`.
- [#3665](https://github.com/xmtp/libxmtp/pull/3665) — `xmtp_proto` bump.
- [#3666](https://github.com/xmtp/libxmtp/pull/3666) — `EXTERNAL_COMMIT_POLICY` well-known component.
- [#3667](https://github.com/xmtp/libxmtp/pull/3667) — `ValidatedCommit::from_external_commit`.
- [#3668](https://github.com/xmtp/libxmtp/pull/3668) — `Sender::NewMemberCommit` ingestion routing.
- [#3669](https://github.com/xmtp/libxmtp/pull/3669) — Generalized payload-encryption helpers.
- [#3670](https://github.com/xmtp/libxmtp/pull/3670) — `xmtp_mls_common::invite::payload`.
- [#3671](https://github.com/xmtp/libxmtp/pull/3671) — `xmtp_mls_common::invite::encrypted_group_info`.
- [#3672](https://github.com/xmtp/libxmtp/pull/3672) — openmls fork bump for by-value external-commit proposals.
- [#3673](https://github.com/xmtp/libxmtp/pull/3673) — `MlsGroup::create_external_invite`.
- [#3674](https://github.com/xmtp/libxmtp/pull/3674) — `Client::join_group_by_external_invite`.
- [#3675](https://github.com/xmtp/libxmtp/pull/3675), [#3676](https://github.com/xmtp/libxmtp/pull/3676) — NAPI bindings.
- [#3677](https://github.com/xmtp/libxmtp/pull/3677) — End-to-end integration test.

proto:

- [xmtp/proto#333](https://github.com/xmtp/proto/pull/333) — `AppDataUpdateData` intent.
- [xmtp/proto#334](https://github.com/xmtp/proto/pull/334) — `ExternalInvitePayload`, `EncryptedGroupInfoBlob`, `ExternalCommitPolicy`, `external_committer_permissions`.

openmls:

- An upstream patch is in flight to relax the `&mut MlsGroup` gate on `add_proposal` / `add_proposals` to `BorrowMut<MlsGroup>`, allowing by-value proposals on the external `CommitBuilder`. The XMTP fork carries the patch pending upstream merge.

## Security considerations

### Capability semantics

`ExternalInvitePayload` is a **shareable secret**. Anyone in possession of the payload can join the group while the master switch is on and the blob is current. Applications MUST treat the payload bytes as sensitive: do not log them, do not include them in analytics, do not transmit them over unencrypted channels. The QR / link is the only authorized transport.

### Forward secrecy

Within the lifetime of a single invite, there is no forward secrecy: any party that has ever held the `symmetric_key` can decrypt every blob the service serves under the corresponding `external_group_id` slot until rotation. This is acceptable because (a) the blob exposes only current-epoch `GroupInfo` (not historical messages), and (b) any holder of the payload is by design authorized to join the group.

Across rotations, forward secrecy is automatic: the new `symmetric_key` replaces the old at the service slot, and old key holders cannot decrypt the new ciphertext.

### Malicious service

The service is untrusted with respect to confidentiality (it never sees the symmetric key) and integrity of MLS state (AEAD prevents undetected mutation). The remaining attack surface is **availability** (deny service to scanners) and **substitution** (serve a blob from a different group). Substitution is prevented at two layers: (1) AEAD authentication — a blob wrapped under a different group's `symmetric_key` fails the unwrap, since each invite generates a fresh random 256-bit key; (2) post-join correlation — the joiner verifies the QR's `external_group_id` matches the freshly-synced `EXTERNAL_COMMIT_POLICY.external_group_id`, catching stale-QR or wrong-slot scenarios.

This XIP intentionally does not constrain the application to a single service. The `service_pointer` is per-QR application-defined opaque bytes, and applications MAY upload the same encrypted blob to multiple services (different providers, geographic mirrors, on-prem fallbacks, etc.) — each QR variant points at a different service while sharing the `symmetric_key` and `external_group_id` from the group's `EXTERNAL_COMMIT_POLICY`. Any one service being taken offline or refusing to serve does not strand scanners holding a QR for another service. Joiners always re-upload to the `service_pointer` carried by the QR they scanned (see the join-side flow), so per-service blobs stay independently fresh. Cross-service consistency at equal epoch is guaranteed by MLS determinism (all members derive the same `group_state_hash`), and the per-service fork-rejection rule still applies locally to each slot.

### Service-side concurrent uploads

If two members each generate a commit at epoch N concurrently and each tries to upload the resulting blob, one of them is on a forked view of the group. The service's fork-rejection rule (same epoch, different hash → reject) surfaces this to the uploaders. Resolution is application-policy: the admin can re-issue an invite, or one of the uploading members can re-sync and try again.

### Stolen-blob replay

A blob captured at epoch N becomes useless the moment the group advances past N, because the joiner's commit at the stale epoch fails validation. The `EXTERNAL_COMMIT_POLICY.expire_in_ns` field bounds the maximum staleness explicitly; admins SHOULD set it to a value commensurate with the campaign's expected join latency.

### DoS

- **Junk uploads.** The service can rate-limit by `external_group_id` and by source IP / authenticated identity. Outside libxmtp scope.
- **Forced fork-rejection.** A malicious member colluding with a scanner could attempt to upload a forked blob to wedge the service slot. The fork-rejection rule causes the service to refuse the bad upload, but the legitimate admin must observe and respond. Detection / response are application-policy.
- **Replay against the validator.** Existing members are already constrained by `expire_in_ns`; a replayed commit at a stale epoch fails MLS validation anyway.

### Cross-application invite leakage

A QR code is human-shareable by design. An attacker who photographs a poster can join the group. This is the intended threat model: the invite is the capability and protections beyond "treat it as a secret" must come from application-level mitigations (short expiry, low-value group state, post-join challenge flows, etc.).

### Threat model

| Actor | Capability | Mitigation |
| --- | --- | --- |
| Malicious service | Substitute blob from a different group | AEAD authentication (each invite has a fresh 256-bit key); post-join `external_group_id` correlation check |
| Malicious service | Refuse to serve | Protocol does not require a single service: application MAY upload the blob to multiple services (different providers, mirrors, fallbacks). Each QR's `service_pointer` selects one; one service refusing to serve does not strand QRs that point at another. Admin can additionally rotate to a new service via re-upload. |
| Member with stale invite | Decrypt blobs after rotation | Rotation generates a new symmetric key; old key fails AEAD |
| Non-member with payload | Join when master switch is off | `EXTERNAL_COMMIT_POLICY.allow_external_commit` gate; existing members reject |
| Non-member with payload | Add other inboxes' installations | Validator rejects: every `Add` must share the joiner's `inbox_id` |
| Non-member with payload | Touch components beyond `GROUP_MEMBERSHIP` | Validator rejects: `external_committer_permissions` defaults to all-Deny |
| Non-member with payload | Replay commit at stale epoch | MLS validation rejects; `expire_in_ns` provides additional bound |
| Existing member | Forge an external commit as if from a non-member | Sender is verified against the commit signature; spoofing fails standard MLS auth |

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
