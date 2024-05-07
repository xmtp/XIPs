---
xip: 47
title: Group Chat Permissions
description: This proposal describes a simple, flexible, updatable group chat permissions system.
author: Cameron Voell (@Cameron_Voell), Eleanor Hofstedt (@Eleanor_Hofstedt)
discussions-to: TBD
status: Draft
type: Standards
category: Core
created: 2024-05-07
---

## Abstract

For many compelling group chat use cases—such as those with open invitations, semi-anonymous identities, or a large number of members—a permission system becomes critical for the chat to function effectively. This XIP proposal aims to provide application developers with the tools necessary to implement trustworthy permission features without excessive complexity, while still retaining flexibility. The following proposal describes how XMTP can utilize MLS Group Context Extensions in order to configure which users in a chat are allowed to perform actions like add or remove group members, as well as who is allowed to modify those permissions over time.

## Specification

### Background

The XMTP Group chat implementation utilizes the Messaging Layer Security Protocol( or **MLS)** described in [IETF RFC 9420](https://www.rfc-editor.org/rfc/rfc9420.html). The MLS standard includes a `Group Context` object that represents the shared configuration between all members of the group, and contains flexibility for defining custom `UnknownExtensions` that contain arbitrary byte data. 

By utilizing MLS Group Context Extensions to store our “Permissions” configuration data, we can ensure that all group members agree on the current state of the permissions parameters of the group, that the settings remain encrypted and unreadable to any non members, and that no one outside the group will have the ability to affect the permissions configuration.

Currently in groups beta we have the following **Permissions Policies**:

1. `add_member_policy`
2. `remove_member_policy`
3. `update_metadata_policy`

Each of those policies can have one of the following **Permission Options**:

1. `UNSPECIFIED`
2. `ALLOW`
3. `DENY`
4. `CREATOR_ONLY`

### Mutable Admin Permissions Update Specification

This XIP is proposing to add the following new **Permission Policies**:

4. `add_admin_policy`
5. `remove_admin_policy`
6. `update_permissions_policy`

We also propose to add the following new **Permission Options**:

5. `ALLOW_IF_ADMIN_OR_SUPER_ADMIN`
6. `ALLOW_IF_SUPER_ADMIN`

To enable the two new permission options the following will be added to Mutable metadata Protobuf definitions:

```
message GroupMutableMetadataV1 {
...
  AccountAddresses admin_list = 2;
  AccountAddresses super_admin_list = 3;
}

// Wrapper around a list of repeated EVM Account Addresses
message AccountAddresses {
  repeated string account_addresses = 1;
}

```

The above Permission options will enable use cases like the following:

1. **Admins can update permissions** -- The group starts out small with open permissions and then adds restrictions over time as they pass a few dozen users so that only admins can remove users or update the group name and project URL. 
2. **Group creator can add another admin** -- The leader of an online project starts a group chat with themselves as the super admin who can add and remove admins and update group information etc. There is no fear that admins take over the group because they are still the only super admin. After some time, they would like to move on from the project, so they can add someone else to be a super admin. 
3. **Admins can update permissions when new functionality is available** -- 6 months from now XMTP adds new group functions like mute members. There is an update path so that existing groups can get these new features without losing the existing group history.

**Sensible Default Options** - In order to allow flexibility of permissions without making it too confusing for developers and users, the approach will be to have only a few default permission sets that cover most use cases that can easily be passed in as a parameter on group creation. For developers who want to fine tune individual permission options for different group actions, we will allow those developers to construct their own initial permission set on group creation. In both cases permissions sets can be updated over time, following the `update_permissions_policy`. Example default policies include:

1. All Members can perform all actions (except add/remove admin/super admin)
2. Only Admins can add/remove or update group data (group name, links, etc)

## Rationale

The need for admin functionality in groups of larger size is self evident for anyone who’s ever used discord, telegram, or tried to maintain usefulness of any group with a size over a few dozen people.

One implementation detail we considered is whether permissions could function on a two tier system of members and admins, or if we needed a three tiered system of members, admins, and super admins. At this point, contributors agree the three-tier system is necessary because of the case when a creator wants to delegate some responsibilities(`remove_member`, `update_metadata`) to be “admin only”, and they might not want to immediately risk other admins removing them as an admin. In other words, the three-tier system allows a happy medium of delegatable admin responsibilities without risking group takeover. 

Another consideration that was made was whether it is worth the extra complexity to make permissions upgradable. The choice to allow permissions to be updated, as long as the member updating qualifies against the `update_permissions_policy` seems necessary because of the use case of accidental initial group permission misconfiguration, as well as a group’s trust dynamic evolving over time which also seems like a valid use case to consider. Just because an online project chat starts as a small group of all well-intentioned contributors does not mean that the group can not evolve to have a larger variety of member trustworthiness and contributor type over time.

## Backward compatibility

In addition to adding the new Permission Policies, the new Permission Options, and making Permission Updatable, we will also make the permission system itself upgradable in the following ways:

1. `libxmtp` can be updated so that existing groups can add new Permission Policies via the proto `map<string, MetadataPolicy> update_metadata_policy.` This means that if later on we would like to add a new Permission Policy to groups like "The Ability to Mute Group Members", we would be able to add that without breaking any existing groups.
2. Deprecation and upgrade of the Permissions or Metadata Extensions in an existing groups Group Context - Existing groups would not be able to include an entirely new Permissions or Metadata Extension until all members of the group updated to a new version of libxmtp and performed a "leaf node update" commit they updated their "supported capabilities". For existing groups, one way this could work would be to have a generous grace period, say of a few weeks or months, after which, any group member who has not been upgraded could be removed by an admin. At that point the group could be updated to enable new permission / metadata extensions. The hope is that this type of upgrade might never have to happen, or could be very rare 9less than once a year and even less frequent as time passes). For more information see the [MLS RFC Required Capabilities section.](https://www.rfc-editor.org/rfc/rfc9420.html#name-required-capabilities)

## Reference implementation

An example of the updates required for protobuf objects can be seen in the PR here: https://github.com/xmtp/proto/pull/175

```solidity
// Message for group mutable permissions
message GroupMutablePermissionsV1 {
  PolicySet policies = 1;
}

// The set of policies that govern the group
message PolicySet {
  MembershipPolicy add_member_policy = 1;
  MembershipPolicy remove_member_policy = 2;
  map<string, MetadataPolicy> update_metadata_policy = 3;
  PermissionsUpdatePolicy add_admin_policy = 4;
  PermissionsUpdatePolicy remove_admin_policy = 5;
  PermissionsUpdatePolicy update_permissions_policy = 6;
}

// Message for group mutable metadata
message GroupMutableMetadataV1 {
  // Map to store various metadata attributes (Group name, etc.)
  map<string, string> attributes = 1;  
  AccountAddresses admin_list = 2;
  // Creator starts as only super_admin
  // Only super_admin can add/remove other super_admin
  AccountAddresses super_admin_list = 3;
}

// Wrapper around a list of repeated EVM Account Addresses
message AccountAddresses {
  repeated string account_addresses = 1;
}
```

## Security considerations

The main security consideration with this update is to ensure that 1. Developers and Users of XMTP can understand how permissions are intended to work, and 2. That permissions does not have any bugs that would allow a super admin to be cast kicked out of their own group, or for a groups permissions to not behave as expected. Though it will likely always possible for someone to lose admin controls over their own group if they take actions to remove themselves, we will strive to make tests and documentations and Default permission options as intuitive as possible in order to minimize this risk.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).