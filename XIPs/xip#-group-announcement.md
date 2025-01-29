# XIP-X: Group Announcements

- xip: X
- title: Group Announcements
- description: A way to send a global group announcement to a group that can be displayed to all participants on join.
- author: Naomi Plasterer (@nplasterer)
- status: Draft
- type: Standards track
- category: XRCX
- created: 2025-01-27

## **Abstract**

This XRC proposes a way to send a new application message to all new group participants on group add that can be handled, filtered, and displayed differently on applications.

## **Motivation**

When groups become large it’s important to set a standard for how people should act in the group and a way to share announcements to the whole group without spamming the group.

## **Specification**

Proposal 1: A new metadata field called announcement

```
group.announcement()
group.setAnnouncement("Please check out the group rules in the description")
```

This would be the similar to a description of a group but could be displayed differently as a banner and could have permissions so it can be only set by an admin. Capped at a 300 character limit

## **Backward compatibility**

This is a breaking change. All members of a group must be on a version of the sdk that supports this new metadata to be able to use this inside a group.

## **Reference implementation**

- Similar to https://github.com/xmtp/libxmtp/pull/841

## **Security considerations**

By making this an admin only feature it helps protect against member attacks on a large group.

Since this message considered to be part of the group-metadata, all of the new added members can see the message.

## **Copyright**

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
