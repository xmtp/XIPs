---
xip: 81
title: App Data Updates
description: Replace GroupContextExtensions with AppDataUpdate proposals for delta-based mutable group state with per-component permissions.
author: Tyler Hawkes (@tylerhawkes)
status: Draft
type: Standards
category: Core
created: 2026-05-20
---

## Abstract

This XIP replaces GroupContextExtensions (GCE) with AppDataUpdate proposals for all mutable group state in XMTP. GCE requires replacing the entire extensions set on every update, which is bandwidth-inefficient, conflict-prone, and prevents granular permissions. AppDataUpdate proposals target individual components with delta updates, enabling concurrent non-conflicting changes and permission enforcement per component.

## Motivation

XMTP groups currently use GroupContextExtensions (GCE) proposals to update all mutable group state: membership, metadata, permissions, and application data. GCE has several fundamental limitations:

**Full-state replacement.** Every GCE proposal replaces the *entire* set of group context extensions. Updating a single metadata field (e.g., group name) requires re-serializing and transmitting membership, permissions, admin lists, and all other extensions. This is bandwidth-inefficient, especially for large groups.

**Conflict-prone.** Two concurrent GCE proposals cannot both succeed. If Alice updates the group name while Bob updates the group description, the second commit will replace the first's changes entirely. There is no merge strategy — last writer wins.

**Coupled state.** Unrelated concerns are bundled into a single update mechanism. A membership change (adding a member) requires carrying along metadata and permissions extensions unchanged. This coupling makes it difficult to reason about what changed in a commit and creates unnecessary validation complexity.

**No granular permissions.** The current permission system maps policies to specific operations (add member, update metadata field X), but the underlying transport treats all extensions as a single blob. There is no way to express "any member can update component A, but only admins can update component B" at the MLS extension level.

The MLS extensions draft (draft-ietf-mls-extensions) introduces `AppDataUpdate` proposals that target individual components in an `AppDataDictionary` with delta updates. This XIP leverages that mechanism to address all of the above limitations.

## Specification

The keywords "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in [RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

### 1. Proposal Support Foundation

This section describes the proposal-by-reference infrastructure that has already been implemented and serves as the foundation for this XIP.

### 1.1 Proposal Support Extension

A custom extension with ID `0xff05` (`PROPOSAL_SUPPORT_EXTENSION_ID`) is used in two contexts:

- **Leaf node capabilities**: When included in a key package's leaf node capabilities, it indicates the installation supports receiving standalone MLS proposals (not just commits).
- **Group context**: When present in the group's extensions, it indicates the group operates in proposal-by-reference mode exclusively.

The extension carries a `ProposalSupport` proto with a `version` field (currently `1`).

### 1.2 Capability Negotiation

Before enabling proposals on a group, the initiator MUST verify that all current members support the proposal extension:

1. Check leaf nodes in the local ratchet tree (the MLS group state containing all members' leaf nodes) for `PROPOSAL_SUPPORT_EXTENSION_ID` in capabilities.
2. If any local leaf node does not advertise support, fetch fresh key packages from the server.
3. If all key packages include the extension in capabilities, proposals MAY be enabled.
4. If any member does not support proposals, the group MUST remain in direct-commit mode.

When adding new members to a proposal-enabled group, the adder MUST verify the new member's key packages support `PROPOSAL_SUPPORT_EXTENSION_ID`. If new members do not support proposals, the proposal support extension MUST be removed from the group context and the group reverts to direct-commit mode.

### 1.3 Enable Proposals Flow

Enabling proposals is a bootstrapping operation. The group is not yet in proposal mode, so a standard MLS proposal-then-commit sequence is used with the existing direct-publish mechanism. The `ProposeGroupContextExtensions` intent explicitly bypasses the `proposals_enabled` check since it is the mechanism used to enable proposals in the first place.

To enable proposals on a group:

1. Verify all members support proposals (Section 1.2).
2. Build the new group context extensions containing the `ProposalSupport` extension and updated `RequiredCapabilities`.
3. Queue a `ProposeGroupContextExtensions` intent with the serialized extensions. This intent handler does NOT require proposals to already be enabled — it creates a standard MLS GCE proposal and publishes it directly.
4. Sync until the proposal intent resolves.
5. Re-verify member support has not changed during sync — incoming messages may have added members who don't support proposals.
6. Queue a `CommitPendingProposals` intent to commit the pending GCE proposal.
7. Sync until the commit intent resolves.
8. Verify the proposal support extension is present in the committed group state.

After this flow completes, the group is in proposal mode and all subsequent state updates use proposal-by-reference.

### 1.4 Proposal Validation

When receiving proposals, the following validation rules apply:

| Proposal Type | Validation |
| --- | --- |
| **Add** | Proposer MUST have `add_member` permission. DM groups allow adding the other DM participant regardless of policy. |
| **Remove** | Proposer MUST have `remove_member` permission. Super admins MUST NOT be removed. |
| **Update** | The new leaf node credential MUST match the proposer's identity. Prevents identity swaps. |
| **GroupContextExtensions** | Proposer MUST have permission for each changed field (metadata, admin lists, permissions). Only super admins MAY change permissions or super admin lists. |
| **PreSharedKey** | MUST be rejected (`UnsupportedProposalType`). |
| **ReInit** | MUST be rejected (`UnsupportedProposalType`). |
| **ExternalInit** | MUST be rejected (`UnsupportedProposalType`). |
| **SelfRemove** | MUST be rejected (`UnsupportedProposalType`). |
| **AppDataUpdate** | See Section 2.4 for proposed validation. |
| **AppEphemeral** | MUST be rejected (`UnsupportedProposalType`). |
| **Custom** | MUST be rejected (`UnsupportedProposalType`), except for `BatchProposal` (`0xff00`) defined in Section 4.2. |

### 1.5 Membership Commit Flows

There are two flows for committing membership changes, depending on whether the caller directly updates membership or proposes changes for a later commit.

#### 1.5.1 Batched Flow (UpdateGroupMembership)

When `add_members` or `remove_members` is called with proposals enabled, all messages are published atomically in a single `send_group_messages` call:

1. Create Add/Remove proposals for the membership changes.
2. Analyze the proposals to determine updated membership.
3. Build an updated `GroupMembership` extension with new inbox IDs and sequence IDs.
4. Create a GCE proposal with the updated membership extension.
5. Create a commit consuming all pending proposals (including the just-created GCE).
6. Publish the Add/Remove proposals, GCE proposal, and commit together in one call.

When the commit is received back from the network, the staged commit is merged. No re-queuing is needed.

#### 1.5.2 Two-Phase Flow (ProposeMemberUpdate + CommitPendingProposals)

When membership changes are proposed separately and committed later:

**Phase 1 (Propose):**

1. Create Add/Remove proposals for the membership changes.
2. Publish only the proposals. No GCE proposal or commit is created at this stage.

**Phase 2 (Commit):**

1. Receive the Add/Remove proposals back from the network.
2. Re-queue the `CommitPendingProposals` intent to `ToPublish`.
3. Analyze the pending proposals to determine updated membership.
4. Build an updated `GroupMembership` extension with new inbox IDs and sequence IDs.
5. Create a GCE proposal with the updated membership extension.
6. Create a commit consuming all pending proposals (including the new GCE).
7. Publish the GCE proposal and commit together in one call.

If a matching GCE proposal already exists in the pending proposals (compared by `members` field only), step 5 is skipped and the existing GCE is consumed by the commit.

### 2. AppDataDictionary and ComponentId Ranges

### 2.1 AppDataDictionary Extension

The `AppDataDictionary` is a group context extension (ExtensionType 6) defined in the MLS extensions draft. It stores a map of `ComponentId` (u16) to `ComponentData` (arbitrary bytes), maintained in ascending order by ComponentId.

All mutable group state that is currently stored in custom `Extension::Unknown` variants MUST be migrated into the `AppDataDictionary` as individual components. Each component stores its own serialized payload (see Section 2.6 for serialization requirements).

### 2.2 ComponentId Permission Ranges

The permission levels below (super admin, admin, any member) map to the role-based permission system defined in [XIP-47](https://github.com/xmtp/XIPs/blob/main/XIPs/xip-47-group-chat-permissions.md). ComponentId values in the private range (`0x8000-0xffff`) are split equally between XMTP protocol use and application-defined components:

**XMTP Protocol Range (`0x8000-0xbfff`):**

| Range | Permission Level | Description |
| --- | --- | --- |
| `0x8000-0x87ff` | Immutable | Set once at group creation, cannot be modified (conversation type, creator) |
| `0x8800-0x8fff` | Super Admin | Protected configuration: permission policies, super admin lists |
| `0x9000-0x97ff` | Admin or Super Admin | Administrative state: admin lists |
| `0x9800-0x9fff` | Any Member | User-facing metadata: group name, description, image, app data, membership |
| `0xa000-0xa7ff` | Inbox Id | Inbox owned metadata: Display name, avatar link, etc. |
| `0xa800-0xafff` | Installation Id | Installation owned metadata: ??? |
| `0xb000-0xbfff` | Reserved | Reserved for future XMTP protocol use |

**Application Range (`0xc000-0xfeff`):**

| Range | Permission Level | Description |
| --- | --- | --- |
| `0xc000-0xc7ff` | Immutable | Application components set once at creation, cannot be modified |
| `0xc800-0xcfff` | Super Admin | Application components requiring super admin writes |
| `0xd000-0xd7ff` | Admin or Super Admin | Application components requiring admin writes |
| `0xd800-0xdfff` | Any Member | Application components writable by any member |
| `0xe000-0xe7ff` | Inbox Id | Inbox owned metadata |
| `0xe800-0xefff` | Installation Id | Installation owned metadata |
| `0xf000-0xfeff` | Reserved | Reserved for future application permission levels |

**Reserved (`0xff00-0xffff`):** Protocol-level reserved IDs.

**Immutable semantics:** Components in an immutable range MAY only be written when the ComponentId does not yet exist in the `AppDataDictionary`. Any `AppDataUpdate` proposal targeting an immutable ComponentId that already has a value MUST be rejected. `Remove` operations on immutable components MUST also be rejected. This ensures that once set (typically at group creation), these values can never be changed or deleted.

**Inbox Id semantics:** any installation that is part of the inbox can edit this data, but the protocol will enforce that it goes into a map that is keyed by the InboxId.

Permission validation is derived from the ComponentId range as a default:

```rust
fn default_permission_for_component(id: ComponentId) -> PermissionLevel {
    match id {
        // XMTP protocol ranges
        0x8000..=0x87ff => PermissionLevel::Immutable,
        0x8800..=0x8fff => PermissionLevel::SuperAdmin,
        0x9000..=0x97ff => PermissionLevel::AdminOrSuperAdmin,
        0x9800..=0x9fff => PermissionLevel::AnyMember,
        // Application ranges (mirror protocol permission structure)
        0xc000..=0xc7ff => PermissionLevel::Immutable,
        0xc800..=0xcfff => PermissionLevel::SuperAdmin,
        0xd000..=0xdfff => PermissionLevel::AdminOrSuperAdmin,
        0xe000..=0xefff => PermissionLevel::AnyMember,
        // Reserved and unknown — reject unconditionally
        _ => PermissionLevel::Deny,
    }
}
```

#### 2.2.1 Permission Override Map

Groups MAY override the default permission level for any ComponentId using a **permission override map** stored at a well-known super-admin-only ComponentId (`0x8801`). The override map is a sorted list of `(ComponentId, PermissionLevel)` entries, serialized deterministically (Section 2.6).

```rust
struct PermissionOverrideMap {
  overrides: Vec<PermissionOverride>,  // sorted by component_id, no duplicates
}

struct PermissionOverride {
  component_id: ComponentId,
  permission_level: PermissionLevel,
}
```

**Resolution order:**

```rust
fn permission_for_component(id: ComponentId, overrides: &PermissionOverrideMap) -> PermissionLevel {
    if let Some(override) = overrides.get(id) {
        return override.permission_level;
    }
    default_permission_for_component(id)
}
```

Overrides can adjust permissions in either direction — a ComponentId in the AnyMember range can be restricted to AdminOrSuperAdmin, and a ComponentId in the SuperAdmin range can be opened to AnyMember. This allows groups to customize access policies without being constrained by the range a ComponentId falls in.

**Constraints:**

- The override map itself (`0x8801`) MUST remain super-admin-only. It cannot override its own permission level.
- Overrides MUST NOT target ComponentIds in the `Deny` range (`0xa000-0xbfff`, `0xf000-0xfeff`, `0xff00-0xffff`). Reserved ranges are unconditionally denied regardless of overrides.
- Overrides MUST NOT change `Immutable` semantics — they can change *who* can set an immutable component initially, but once set, immutable components still cannot be modified or removed.
- The override map is itself a delta-based component and MUST use deterministic serialization (Section 2.6).

#### 2.2.2 Application ComponentId Registration

Applications using the application range (`0xc000-0xfeff`) need a mechanism to avoid ComponentId conflicts when multiple applications interact with the same XMTP group.

The recommended approach is an **on-chain registry** — a smart contract where applications claim ComponentId sub-ranges:

- Applications call `register(app_identifier)` to claim the next available sub-range, using an app domain or ENS name as the identifier.
- The registry maps `app_identifier -> (start_id, end_id)` on-chain.
- Clients query the registry to resolve an application's ComponentId range.
- Immutable and decentralized — no single point of failure.
- A registered range is permanent; applications cannot lose their allocation.

See Rationale for alternative registration approaches considered.

### 2.3 Well-Known Component IDs

The following ComponentIds are defined for XMTP group state:

**Immutable range (`0x8000-0x87ff`):**

| ComponentId | Name | Proto Type | Description |
| --- | --- | --- | --- |
| `0x8000` | ConversationType | `GroupMetadata` | Conversation type (Group, DM, Sync) |
| `0x8001` | CreatorInboxId | `MetadataFieldValue` | Inbox ID of the group creator |

**Super Admin range (`0x8800-0x8fff`):**

| ComponentId | Name | Proto Type | Description |
| --- | --- | --- | --- |
| `0x8800` | PermissionPolicies | `PolicySet` | Group permission policies |
| `0x8801` | PermissionOverrideMap | `PermissionOverrideMap` | Per-component permission overrides (Section 2.2.1) |
| `0x8002` | SuperAdminList | `SuperAdminListUpdate` | List of super admin inbox IDs |

**Admin range (`0x9000-0x97ff`):**

| ComponentId | Name | Proto Type | Description |
| --- | --- | --- | --- |
| `0x9000` | AdminList | `AdminListUpdate` | List of admin inbox IDs |

**Any Member range (`0x9800-0x9fff`):**

| ComponentId | Name | Proto Type | Description |
| --- | --- | --- | --- |
| `0x9800` | GroupName | `MetadataFieldValue` | Human-readable group name |
| `0x9801` | GroupDescription | `MetadataFieldValue` | Group description text |
| `0x9802` | GroupImageUrl | `MetadataFieldValue` | Group image URL |
| `0x9803` | PinnedFrameUrl | `MetadataFieldValue` | Pinned frame URL |
| `0x9804` | AppData | `MetadataFieldValue` | Application-specific data string |
| `0x9810` | GroupMembership | `GroupMembershipUpdate` | Inbox IDs, sequence IDs, failed installations |

### 2.4 AppDataUpdate Proposal Validation

When receiving an `AppDataUpdate` proposal:

1. Verify the proposer is a current member of the group. All `AppDataUpdate` proposals MUST be rejected with `ActorNotMember` if the proposer is not a member, regardless of the target ComponentId or permission level.
2. Extract the `ComponentId` from the proposal.
3. Determine the required permission level from the ComponentId range (Section 2.2).
4. Build a `CommitParticipant` for the proposer from the MLS sender leaf index.
5. Validate the proposer has the required permission level:
    - `Deny`: reject unconditionally — the ComponentId is in a reserved range.
    - `Immutable`: if the ComponentId already exists in the `AppDataDictionary`, reject (immutable components cannot be modified or removed). If it does not exist, the proposer MUST be a super admin to set it initially.
    - `SuperAdmin`: proposer MUST be a super admin.
    - `AdminOrSuperAdmin`: proposer MUST be an admin or super admin.
    - `AnyMember`: any group member (membership already verified in step 1).
6. Reject the proposal with `InsufficientPermissions` if validation fails.

### 2.5 AppDataUpdate Processing

When processing a commit containing `AppDataUpdate` proposals, the receiver MUST:

1. Build an `AppDataDictionaryUpdater` from the current group state.
2. For each `AppDataUpdate` proposal in the commit:
    - If `Update(data)`: set the component data for the given ComponentId.
    - If `Remove`: remove the component data for the given ComponentId.
3. Call `process_unverified_message_with_app_data_updates` with the computed updates.
4. Persist the updated component values to local storage.

### 2.6 Deterministic Serialization

The `AppDataDictionary` is a GroupContext extension. The serialized GroupContext is an input to the MLS key schedule (epoch secret derivation), transcript hash, and tree hash. All group members MUST produce byte-identical GroupContext serializations after processing a commit, or their derived keys will diverge and they will be unable to decrypt messages.

For components where an `AppDataUpdate` proposal carries the **complete replacement value** (e.g., group name, description, image URL), this is not a concern — the proposer's serialized bytes are stored as-is in the `ComponentData` and all members receive identical bytes from the proposal.

For components where the proposal carries a **delta** and members independently reconstruct the full state (e.g., GroupMembership — "add inbox X with sequence ID Y"), all members must serialize the reconstructed state identically. This is problematic with protobuf, which does not guarantee deterministic serialization: map field ordering is unspecified, and different implementations may produce different byte sequences for semantically identical messages.

To address this, delta-based components MUST use a serialization format that guarantees deterministic output. The following options are considered:

1. **TLS Codec serialization.** Use the TLS presentation language encoding (RFC 8446 Section 3) instead of protobuf for delta-based components. TLS codec is inherently deterministic: fixed field ordering, fixed-width integers, length-prefixed variable-length fields, no optional fields. The MLS protocol and OpenMLS already use TLS codec extensively. Delta-based components SHOULD define TLS codec structs with sorted, length-prefixed vectors rather than maps.
2. **Canonical protobuf encoding.** If protobuf is used, the schema MUST avoid `map` fields entirely. Use sorted `repeated` message fields instead (e.g., `repeated MemberEntry members = 1` where entries are sorted by inbox ID). All implementations MUST sort entries identically before serialization. This approach is more fragile than TLS codec since it relies on convention rather than format guarantees.
3. **Bincode.** A compact binary format with deterministic output when using fixed-int encoding and sorted collections. Widely used in the Rust ecosystem. Determinism depends on configuration — `bincode::config::standard()` with fixed-length integer encoding produces consistent output. However, bincode is Rust-centric and lacks mature implementations in other languages (Swift, Kotlin, TypeScript), which is a concern for cross-platform XMTP clients.
4. **rkyv (zero-copy deserialization).** Produces a deterministic archive format that can be read without deserialization. Extremely fast for reads. However, rkyv's format is tied to Rust struct layout and alignment, making cross-language compatibility difficult. The archived format also includes alignment padding that may differ across architectures, breaking byte-identical guarantees unless care is taken.
5. **ASN.1 DER (Distinguished Encoding Rules).** A canonical encoding standardized in X.690. Guarantees exactly one encoding for each value. Mature cross-language support. However, DER is verbose and complex compared to TLS codec, and is not used elsewhere in the MLS ecosystem.

**Recommendation:** Delta-based components (GroupMembership, AdminList, SuperAdminList) SHOULD use TLS codec serialization. It is already the serialization format of MLS itself, has determinism guarantees by design, is well-supported by OpenMLS, and avoids introducing new serialization dependencies. Simple value components (GroupName, GroupDescription, AppData) MAY use protobuf since they are always replaced wholesale and do not require deterministic re-serialization.

### 3. Eliminating GroupContextExtensions

This section builds on [XIP-72](https://github.com/xmtp/XIPs/blob/main/XIPs/xip-72-protocol-version-client-enforcement.md), which defines `minimum_supported_protocol_version` as mutable metadata and specifies the client enforcement behavior (pausing groups when the version requirement is not met). The mechanisms below extend XIP-72 with tools for assessing migration readiness *before* bumping the min version.

### 3.1 Protocol Version Signaling

Before initiating a migration, clients need to determine what percentage of a group's members will be paused by a version bump (as defined in XIP-72). Two complementary mechanisms provide this signal:

#### Leaf Node Extension (local fast-path)

A new leaf node extension broadcasts the client's supported protocol version in its key package:

```rust
struct ProtocolVersionExtension {
    major: u16,
    minor: u16,
    patch: u16,
}
```

This extension is included in key packages and leaf nodes. When a client upgrades to a new protocol version, it MUST update its leaf node in all groups via an MLS Update proposal to broadcast the new version. Clients can then inspect the ratchet tree locally to check version support across the group without any network requests.

The leaf node data may lag behind the server-side data if a client has upgraded and uploaded a new key package but has not yet updated its leaf node in every group. The server query (below) provides the authoritative count.

#### Server-Side Query (authoritative)

The server tracks the protocol version for each installation based on the latest uploaded key package. Clients query the server for the version distribution across a group's members:

```protobuf
rpc GetGroupVersionSupport(GetGroupVersionSupportRequest) returns (GetGroupVersionSupportResponse);

message GetGroupVersionSupportRequest {
    bytes group_id = 1;
    string target_version = 2;  // The version to check support for
}

message GetGroupVersionSupportResponse {
    uint32 total_members = 1;
    uint32 members_supporting = 2;    // Members with at least one installation at target_version
    uint32 members_not_supporting = 3; // Members with no installations at target_version
}
```

This is the authoritative source of truth since the server sees all key package uploads. Clients SHOULD use this query before initiating a migration to understand the impact.

#### Migration Readiness

A client SHOULD check migration readiness before bumping the min group version:

1. Query the server for version support at the target version.
2. If the percentage of supporting members meets a configurable threshold (e.g., 80%, 100%), proceed with migration.
3. If not, defer migration and optionally notify the user that some members will be paused.

The threshold is an application-level policy decision — some applications may require 100% support before migrating, while others may accept pausing a minority of members.

### 3.2 Transition via Min Group Version

The preferred migration mechanism uses the existing min group version functionality. When a group's minimum protocol version is bumped to a version that requires AppDataUpdate support:

1. Clients that support the new version continue processing normally.
2. Clients on older versions **pause** — they stop processing messages for the group but do not fork or lose state. The group appears paused until the client upgrades.
3. When an old client upgrades, it resumes processing and catches up on all messages it missed while paused, including AppDataUpdate commits.

This avoids the risk of forking that capability-based negotiation introduces, and does not require checking every member's key packages before transitioning.

**Migration flow:**

1. A new libxmtp release ships with AppDataUpdate support and declares a new protocol version (e.g., `2.0.0`).
2. Any member running the new version MAY initiate the migration by:
    1. Reading all current group state from the existing custom extensions:
        - `GroupMembership` from `GROUP_MEMBERSHIP_EXTENSION_ID`
        - `MutableMetadata` from `MUTABLE_METADATA_EXTENSION_ID`
        - `GroupPermissions` from `GROUP_PERMISSIONS_EXTENSION_ID`
    2. Constructing an `AppDataDictionary` containing each state component at its well-known ComponentId (Section 2.3).
    3. Creating a GCE proposal that:
        - Adds the `AppDataDictionary` extension with all migrated state.
        - Removes the old custom `Extension::Unknown` variants.
        - Sets the minimum required protocol version to `2.0.0`.
        - Updates `RequiredCapabilities` to require `AppDataUpdate` proposal type.
    4. Committing the GCE proposal.
3. Old clients see the version bump, pause the group, and wait for an upgrade.
4. After upgrading, old clients resume and process the migration commit along with any subsequent AppDataUpdate commits.

After migration, the group MUST reject any further GCE proposals. All state updates MUST use `AppDataUpdate` proposals.

### 3.3 Alternative: Capability Negotiation

As an alternative to min group version, groups MAY use capability-based negotiation to transition only when all members already support AppDataUpdate:

1. All members' key packages advertise support for the `AppDataDictionary` extension type.
2. All members' key packages advertise support for the `AppDataUpdate` proposal type.
3. The group has proposal support enabled (Section 1).

When all three criteria are met, any member MAY initiate the same migration procedure (Section 3.2, steps 2a-2d) without setting a min version bump.

This approach avoids pausing any members but requires waiting for every member to upgrade before the group can transition. It is suitable for groups where pausing members is unacceptable, but delays the migration until full adoption.

### 3.4 Post-Migration State Updates

After migration, the intent handlers change as follows:

| Intent | Before Migration | After Migration |
| --- | --- | --- |
| MetadataUpdate | GCE commit with full extensions | AppDataUpdate proposal for specific ComponentId |
| UpdateAdminList | GCE commit with full extensions | AppDataUpdate proposal for `0x9000` or `0x9001` |
| UpdatePermission | GCE commit with full extensions | AppDataUpdate proposal for `0x8800` |
| UpdateGroupMembership | GCE proposal + commit | AppDataUpdate proposal for `0x9810` + Add/Remove proposals |

### 4. Atomic Batching via Custom Proposal

### 4.1 Problem Statement

Several group operations require multiple state changes that MUST be applied atomically. For example, adding a member requires both an MLS Add proposal and an update to the GroupMembership component. Currently, this is achieved by creating multiple proposals and a commit in a single `send_group_messages` call, but there is no guarantee the network delivers them atomically.

### 4.2 Recommended: Custom Batch Proposal

Define a custom MLS proposal type (`ProposalType::Unknown(0xff00)`) that wraps a list of standard MLS proposals:

```rust
struct BatchProposal {
    proposals: Vec<Proposal>,
}
```

The `BatchProposal` contains standard MLS `Proposal` values (Add, Remove, AppDataUpdate, GroupContextExtensions, etc.). This avoids introducing new operation types — each inner proposal uses the same data structures and validation logic as if it were a standalone proposal.

**Processing:**

1. When a `BatchProposal` is received, the receiver MUST unbatch it into its constituent proposals.
2. Each inner proposal MUST be validated independently using the existing proposal validation rules (Section 1.4, Section 2.4).
3. If any inner proposal fails validation, the entire batch MUST be rejected.
4. The committer applies all inner proposals when committing, using the same application logic as standalone proposals.

**Semantics:**

- A `BatchProposal` MUST be treated as atomic: either all inner proposals are valid and applied, or none are.
- Validation reuses existing per-proposal-type checks — no new validation code paths are needed.
- A single `BatchProposal` results in a single MLS proposal message on the network.
- Inner proposals MUST be applied in the order they appear in the `proposals` vector.

**Benefits:**

- Single proposal reference for intent tracking.
- Single network message reduces latency and ensures atomicity.
- Works within MLS semantics — no network protocol changes required.
- Supports any combination of proposal types (Add, Remove, AppDataUpdate, etc.).
- Reuses all existing validation and application logic — no new code paths for individual operations.

See Rationale for alternative batching approaches considered.

### 5. Application Data API

### 5.1 Motivation

The current `app_data` API exposes a single opaque string per group. Applications like Convos use this to store structured data (e.g., display name mappings per member). Today, any change requires the application to:

1. Deserialize the entire `app_data` string.
2. Modify one entry (e.g., change a single user's display name).
3. Re-serialize the entire string.
4. Call `update_app_data()`, which triggers a GCE commit replacing all group extensions.

This is inefficient for structured data that changes frequently. With `AppDataUpdate` proposals, we can expose an API that sends only the delta — but the component's internal format must support delta application.

### 5.2 Key-Value Component Format

Application components that need granular updates SHOULD use a key-value map format within a single ComponentId. The component stores a sorted map of `[u8]` keys to `[u8]` values, serialized deterministically (see Section 2.6).

```rust
struct KeyValueComponent {
    entries: Vec<KeyValueEntry>,  // sorted by key, no duplicates
}

struct KeyValueEntry {
    key: Vec<u8>,
    value: Vec<u8>,
}
```

Delta operations are encoded in the `AppDataUpdate` proposal's `ComponentData` as a list of mutations:

```rust
struct KeyValueDelta {
    mutations: Vec<KeyValueMutation>,  // applied in order
}

enum KeyValueMutation {
    Insert { key: Vec<u8>, value: Vec<u8> },
    Update { key: Vec<u8>, value: Vec<u8> },
    Delete { key: Vec<u8> },
}
```

When processing an `AppDataUpdate` proposal for a key-value component:

1. Deserialize the current `ComponentData` as a `KeyValueComponent`.
2. Deserialize the update payload as a `KeyValueDelta`.
3. Apply each mutation in order:
    - `Insert`: add the key-value pair. MUST fail if the key already exists.
    - `Update`: replace the value for an existing key. MUST fail if the key does not exist.
    - `Delete`: remove the key. MUST fail if the key does not exist.
4. Re-serialize the `KeyValueComponent` deterministically (entries sorted by key).

Because all members apply the same delta to the same base state, and the serialization is deterministic, all members produce byte-identical `ComponentData` (Section 2.6).

### 5.3 Client API

The SDK exposes delta operations directly, so applications never need to deserialize or re-serialize the full component:

```rust
// Insert a new key-value pair
conversation.app_data_insert(component_id, key: &[u8], value: &[u8]).await?;

// Update an existing key's value
conversation.app_data_update(component_id, key: &[u8], value: &[u8]).await?;

// Delete a key
conversation.app_data_delete(component_id, key: &[u8]).await?;

// Read a single key (local, no network)
let value: Option<Vec<u8>> = conversation.app_data_get(component_id, key: &[u8])?;

// Read all entries (local, no network)
let entries: Vec<(Vec<u8>, Vec<u8>)> = conversation.app_data_entries(component_id)?;
```

Each write method creates an `AppDataUpdate` proposal containing only the `KeyValueDelta` for the requested mutation. Multiple mutations MAY be batched into a single `KeyValueDelta` within one `AppDataUpdate` proposal.

Bindings for Node.js, WASM, and mobile expose equivalent methods with platform-appropriate types (e.g., `Uint8Array` for WASM, `ByteArray` for Kotlin).

### 5.4 Example: Display Name Mappings

An application like Convos storing per-member display names would use a single ComponentId in the application range (e.g., `0xe000`):

```rust
// Set display name for a member
conversation.app_data_insert(0xe000, b"display:inbox_abc123", b"Alice").await?;

// Change display name
conversation.app_data_update(0xe000, b"display:inbox_abc123", b"Alicia").await?;

// Remove display name
conversation.app_data_delete(0xe000, b"display:inbox_abc123").await?;

// Read display name (local)
let name = conversation.app_data_get(0xe000, b"display:inbox_abc123")?;
```

Each operation sends only the mutation over the network — not the entire display name mapping for all members.

## Rationale

### Why range-based defaults with an override map

A purely range-based model (where the ComponentId alone determines permissions) is simple but inflexible — you cannot make a specific ComponentId more or less restrictive without moving it to a different range. A purely map-based model requires every group to fully configure its permissions at creation time.

The hybrid approach provides sensible defaults from the ranges (most groups never need to customize) while allowing per-group overrides for groups that need different policies. The override map is itself a super-admin-only component, which solves the bootstrapping problem — the default range-based permissions are always available, and the override map can only be modified by super admins.

### Why eliminate GCE entirely

Keeping GCE for some operations while using AppDataUpdate for others creates two code paths for state updates, complicates validation (must check both mechanisms), and leaves the conflict problem unsolved for GCE-managed state. A clean break simplifies the implementation and ensures all state updates benefit from delta semantics.

### Why custom proposal over network protocol change

A custom MLS proposal works within the existing MLS framing and network transport. It requires no changes to nodes, payers, or the `send_group_messages` API. The proposal is self-contained — validators can verify it using standard MLS proposal validation. Network protocol changes are more invasive and require coordinated deployment across infrastructure.

### Why one-time migration over dual-write

Dual-write (writing to both old extensions and AppDataDictionary during a transition period) doubles the bandwidth cost and requires maintaining both code paths indefinitely. A one-time migration is a clean cutover: once migrated, the old code paths can be removed. The migration is safe because it only happens when all members support the new mechanism.

### Atomic batching alternatives

Three approaches were considered for atomic batching:

| Aspect | Custom BatchProposal | Batched GroupMessageInput | Commit-level batching |
| --- | --- | --- | --- |
| Network changes | None | Requires node + payer changes | None |
| Atomicity scope | Single proposal | Network-level delivery | Commit-level only |
| Proposal type coverage | Any (Add, Remove, AppDataUpdate, etc.) | Any | AppDataUpdate only |
| Intent tracking | Single reference | Single reference | Multiple hashes |
| Validation | Reuses existing per-type checks | Client must validate batch contents | Standard MLS |
| Risks | New custom proposal type | Malicious clients can mix proposal/app messages | No atomicity for proposals themselves |

**Batched GroupMessageInput** modifies `GroupMessageInput` to carry multiple MLS messages in a `repeated bytes batch_data` field. All entries are delivered atomically. The main drawback is requiring network protocol changes across all nodes and the payer service, and there is no way to enforce that only proposals (not application messages) are batched together.

**Commit-level batching** uses standard MLS semantics where multiple proposals in a single commit are applied atomically. No new types or protocol changes are needed, but proposals are sent as separate network messages before the commit, and it doesn't solve batching when Add/Remove and AppDataUpdate proposals originate from different proposers.

The **custom BatchProposal** is recommended because it works within MLS semantics, requires no infrastructure changes, and provides atomicity at the proposal level for any combination of proposal types.

### Application ComponentId registration alternatives

| Aspect | On-chain registry | Hash-based namespace | First-write-wins |
| --- | --- | --- | --- |
| Collision risk | None (assigned ranges) | Low (hash collisions) | Per-group only |
| Infrastructure | Smart contract | None | None |
| Coordination | Global, permanent | Convention-based | Per-group |
| Multi-app groups | Safe | Mostly safe | Fragile |

**Hash-based namespace** derives a ComponentId sub-range from `hash(app_domain) mod range_size + range_start`. Deterministic and requires no infrastructure, but has a small risk of hash collisions with no detection mechanism.

**First-write-wins** uses no global registration — the first `AppDataUpdate` to a ComponentId in a group implicitly claims it. Simplest to implement but fragile in multi-app scenarios since two apps can independently choose the same ComponentId in different groups.

The **on-chain registry** is recommended because it eliminates collision risk entirely and provides permanent, decentralized allocation.

## Backward Compatibility

### Existing Groups

Groups without proposal support continue to operate in direct-commit mode using GCE. No changes are required for these groups until a member initiates migration.

### Mixed-Version Groups

When migration is initiated via min group version (Section 3.2), old clients pause the group rather than fork. They do not lose state and will resume processing after upgrading. This is the preferred approach because it allows migration to proceed without waiting for every member to upgrade.

If capability negotiation (Section 3.3) is used instead, the group MUST NOT migrate until all members support `AppDataUpdate`.

### New Groups

Newly created groups where all initial members support `AppDataUpdate` SHOULD be created with the `AppDataDictionary` from the start, skipping the migration step. The group creator populates the initial component values during group creation and sets the min protocol version to require AppDataUpdate support.

### Client Compatibility

Old clients that do not support `AppDataUpdate` cannot join post-migration groups because `RequiredCapabilities` will include the `AppDataUpdate` proposal type. These clients must upgrade before joining. Old clients already in the group at migration time are paused (not removed) and resume after upgrading.

### BatchProposal

Old clients will reject unknown custom proposal types. The `BatchProposal` (`0xff00`) MUST only be used in groups where all members advertise support for it via `RequiredCapabilities`. Groups that include members without BatchProposal support MUST use individual proposals instead.

## Security Considerations

### Permission Escalation

The ComponentId range model MUST be enforced during proposal validation, not just at the application layer. A malicious proposer could craft an `AppDataUpdate` targeting a super-admin ComponentId. The validator MUST check the proposer's role against the ComponentId range and reject unauthorized updates.

### Custom Proposal Validation

Each sub-operation in a `BatchProposal` MUST be validated independently against the proposer's permissions. A batch containing one permitted and one unpermitted operation MUST be rejected entirely.

### Ordering Attacks

The MLS extensions draft specifies that `AppDataUpdate` proposals MUST be ordered after `GroupContextExtensions` proposals within a commit. Implementations MUST enforce this ordering to prevent a malicious committer from using a GCE to overwrite AppDataDictionary state set by a prior AppDataUpdate.

### Identity Verification

Proposer identity is derived from the MLS sender leaf index and verified against the group's ratchet tree. The `Update` proposal validation (Section 1.4) ensures credential consistency, preventing identity swaps via leaf node updates.

### Threat Model

**Malicious group member:** Could attempt to write to ComponentIds outside their permission range. Mitigated by range-based validation at proposal reception and commit processing.

**Malicious committer:** Could attempt to reorder proposals within a commit to change semantics. Mitigated by MLS ordering constraints and validation during commit processing.

**Malicious node:** Could attempt to drop or reorder messages. AppDataUpdate proposals within a commit are atomic — partial application is not possible. The custom batch proposal further reduces the attack surface by encoding multiple operations in a single message.

**Replay attacks:** MLS epoch-based state prevents replay of proposals from previous epochs. Each proposal is bound to the current group epoch.

## Reference Implementation

The proposal-by-reference foundation is implemented in libxmtp on `main`. Key files:

- [`crates/xmtp_mls/src/groups/mod.rs`](https://github.com/xmtp/libxmtp/blob/f6b7e6e3cd18d7a71ea3e1d45ac252d74c36a2bb/crates/xmtp_mls/src/groups/mod.rs) — `enable_proposals()`, `all_members_support_proposals()`, capability checks, extension builders
- [`crates/xmtp_mls/src/groups/mls_sync.rs`](https://github.com/xmtp/libxmtp/blob/f6b7e6e3cd18d7a71ea3e1d45ac252d74c36a2bb/crates/xmtp_mls/src/groups/mls_sync.rs) — Intent handlers for `ProposeMemberUpdate`, `ProposeGroupContextExtensions`, `CommitPendingProposals`, two-phase commit flow, `PublishIntentData`
- [`crates/xmtp_mls/src/groups/mls_sync/update_group_membership.rs`](https://github.com/xmtp/libxmtp/blob/f6b7e6e3cd18d7a71ea3e1d45ac252d74c36a2bb/crates/xmtp_mls/src/groups/mls_sync/update_group_membership.rs) — Proposal-based and direct-commit membership update paths, `compute_publish_data_for_proposal_based_update`
- [`crates/xmtp_mls/src/groups/validated_commit.rs`](https://github.com/xmtp/libxmtp/blob/f6b7e6e3cd18d7a71ea3e1d45ac252d74c36a2bb/crates/xmtp_mls/src/groups/validated_commit.rs) — `validate_proposal()`, `UnsupportedProposalType` error, proposal type validation table
- [`crates/xmtp_mls/src/groups/group_permissions.rs`](https://github.com/xmtp/libxmtp/blob/f6b7e6e3cd18d7a71ea3e1d45ac252d74c36a2bb/crates/xmtp_mls/src/groups/group_permissions.rs) — `PolicySet`, `MembershipPolicies`, `MetadataPolicies`, `PermissionsPolicies`, `evaluate_commit()`
- [`crates/xmtp_mls/src/groups/intents.rs`](https://github.com/xmtp/libxmtp/blob/f6b7e6e3cd18d7a71ea3e1d45ac252d74c36a2bb/crates/xmtp_mls/src/groups/intents.rs) — `ProposeMemberUpdateIntentData`, `ProposeGroupContextExtensionsIntentData`, `CommitPendingProposalsIntentData`

The `AppDataUpdate` and `AppDataDictionary` APIs are available in OpenMLS behind the `extensions-draft-08` feature flag:

- `MlsGroup::propose_app_data_update()` — Create an AppDataUpdate proposal
- `MlsGroup::app_data_dictionary_updater()` — Build delta updates for processing
- `MlsGroup::process_unverified_message_with_app_data_updates()` — Process commits containing AppDataUpdate proposals
- `AppDataUpdateProposal::update()` / `::remove()` — Construct update/remove operations
- `AppDataDictionary` — BTreeMap-based component storage with ordered, unique entries

## Test Cases

1. **Enable proposals succeeds** — All members support `PROPOSAL_SUPPORT_EXTENSION_ID`. After `enable_proposals()`, the group context contains the extension and subsequent updates use proposal-by-reference.
2. **Enable proposals fails with unsupported member** — One member's key package does not include `PROPOSAL_SUPPORT_EXTENSION_ID`. The group remains in direct-commit mode.
3. **AppDataUpdate accepted for AnyMember range** — A regular member sends an `AppDataUpdate` targeting `0x9800` (GroupName). The proposal is accepted and the component value is updated.
4. **AppDataUpdate rejected for SuperAdmin range** — A regular member sends an `AppDataUpdate` targeting `0x8800` (PermissionPolicies). The proposal is rejected with `InsufficientPermissions`.
5. **AppDataUpdate rejected for immutable component** — A super admin sends an `AppDataUpdate` targeting `0x8000` (ConversationType) which already has a value. The proposal is rejected because immutable components cannot be modified.
6. **AppDataUpdate rejected for reserved range** — Any member sends an `AppDataUpdate` targeting `0xa500` (reserved). The proposal is rejected unconditionally (`Deny`).
7. **BatchProposal atomic success** — A `BatchProposal` containing an Add proposal and an AppDataUpdate (GroupMembership) is committed. Both are applied atomically.
8. **BatchProposal atomic failure** — A `BatchProposal` containing one valid AppDataUpdate and one targeting a super-admin ComponentId from a regular member. The entire batch is rejected.
9. **Migration preserves state** — A group migrates from GCE to `AppDataDictionary`. All state (membership, metadata, permissions) is readable from the new ComponentIds and matches the pre-migration values.
10. **Old clients pause on version bump** — After migration bumps `minimum_supported_protocol_version`, an old client pauses the group. After upgrading, the client resumes and processes all missed commits.
11. **KeyValueDelta Insert fails on existing key** — An `Insert` mutation targets a key that already exists. The proposal is rejected.
12. **KeyValueDelta Update fails on missing key** — An `Update` mutation targets a key that does not exist. The proposal is rejected.

## Open Questions

1. **Migration threshold**: Should the percentage of members required before initiating a version bump be configurable per-group, or should there be a single protocol-wide default (e.g., 100%)?
2. **BatchProposal nesting**: Should `BatchProposal` support nesting (a batch containing another batch)? If not, validation MUST reject nested batches.
3. **BatchProposal size limit**: What is the maximum number of sub-proposals allowed in a single `BatchProposal`? Too many could pass the blockchain size limit.
4. **KeyValueDelta Upsert**: Should `KeyValueDelta` support an `Upsert` operation (insert-or-update) in addition to separate `Insert` and `Update`? Upsert simplifies client code but weakens conflict detection.
5. **Component data size limit**: Should there be a maximum byte size per ComponentId value? Large components could bloat the GroupContext and degrade performance.
6. **On-chain registry timing**: Should the on-chain ComponentId registry be part of v1, or should v1 launch with hash-based namespacing and migrate to the registry later?

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

## Implementation Steps

- ~~TLS Map (byte exact serialization)~~
- Batched proposals (plus control over batching)
- ~~Permission architecture (range, overrides, mixing)~~
- Immutable data
- App data handler implementations
- Group context migration (validate equivalency, bypass permissions at cutover)
- Proposal validation
- Commit validation
- Welcome validation
- Post migration default changes
- API changes
- SDK changes
- Extra tests (not covered by any individual task).

### Optional implementation Steps

- Lazy commits
- App component ids registration
- Pre d14n migrations (for some groups do proposals/app data updates before d14n)?
- InboxId encoding change
- User sub maps (maps inside of inbox id maps)
- Leaf node updates (commit size optimization)
