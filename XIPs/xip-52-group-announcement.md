---
xip: 52
title: Group announcements
description: A way to send a global group announcement to a group that can be displayed to all participants upon joining.
author: Naomi Plasterer (@nplasterer)
discussions-to: https://community.xmtp.org/t/xip-52-group-announcements/866
status: Draft
type: Standards
category: XRC
created: 2025-01-27
---

## Abstract

This XRC proposes a way to send a new application message to all new group participants upon joining the group. Different apps should be able to handle, filter, and display the application message differently.

## Motivation

A groups grow larger, it’s important to be able to communicate a standard, such as group rules, for how participants should act in the group. It's also important to be able to share announcements with the whole group without spamming the group.

## Specification

Proposal: A new metadata field called `announcement`.

```js
group.announcement()
group.setAnnouncement("Please check out the group rules in the description")
```

This would be the similar to a description of a group, but each app can display it differently. For example, one app might choose to display the announcement as a banner in the group, while another app may choose a different presentation. The field could have permissions so only admins can set it. The field has a maximum character limit of 300.

## Backward compatibility

If a group exists before we add group announcements. then it will have no value for group announcement in mutable metadata and no permission policy for who is allowed to update a mutable metadata field with the "groupAnnouncement" key.
Then someone on the new version calls updateGroupAnnouncement on that group to set that value, even though there is no existing permission policy in that group because it is already created. In that case we have default permission policies to evaluate if the metadata update is valid or not.
If someone on an old version is invited to a group from someone on the new version, and so there is a permission policy set for groupAnnouncement.  Users on the older versions will actually be able to read the permission policy because it is fetched using that string key.

## Reference implementation

Similar to [https://github.com/xmtp/libxmtp/pull/841](https://github.com/xmtp/libxmtp/pull/841)

## Security considerations

Making this a metadata field that only admins can set helps protect against member-initiated attacks on a large group.

Because this message is considered a part of the group-metadata, all newly added members can see the message.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
