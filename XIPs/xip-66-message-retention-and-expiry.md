---
xip: 66
title: Message Retention and Expiry Strategy for XMTPD
discussions-to: https://community.xmtp.org/t/
status: Living
type: Process
category: Core, Storage
author: Martin Kysel (@mkysel)
created: 2025-06-24
updated: 2025-06-24
---

## Summary

Storing data on disk constitutes one of the most significant operational costs in a distributed messaging system, potentially accounting for up to 95% of the total infrastructure expense. To mitigate this, many popular platforms employ aggressive message expiration policies. For example, WhatsApp only retains undelivered messages for up to 30 days, while Wire, which uses the MLS protocol, retains data for just 28 days. This proposal outlines a similar strategy for XMTPD, introducing flexible message retention policies that place control in the hands of the payer, allowing them to choose how long messages should be stored based on their needs and willingness to bear the associated costs.

## Message Types and Retention Defaults

XMTPD supports five primary categories of messages, each with different requirements and behaviors regarding retention.

**Key packages** are cryptographic credentials that underpin group and user security. These packages naturally expire after 90 days, and once expired, they cannot be used to establish new secure sessions. Since they are rendered useless beyond their lifetime, the system has no reason to retain them.

**Welcome messages** are dependent on the associated key packages. Once a key package has expired, any welcome message that utilized it becomes effectively unusable. Thus, welcome messages also do not need to be retained past the 90-day validity of the related key package.

**Chat messages** represent the core communication between users. Drawing from industry best practices, the system can safely delete chat messages after 30 days. However, this retention period is not rigid. The responsibility for message storage duration lies with the payer, who can extend or reduce this period as they see fit, balancing cost against convenience.

**Chat metadata and commit messages** present a more nuanced challenge. These messages track the evolution of group states and are more complex in their implications. Initially, these messages will be retained indefinitely while the system gathers operational insights. In the future, shorter retention periods such as 30 or 90 days may be considered, but only after addressing the challenges described in subsequent sections.

Finally, **identity updates** must be preserved permanently. These updates play a critical role in verifying and authenticating user identities across the network. Deleting them could result in broken trust relationships and potential security vulnerabilities.

The overarching design principle is to give payers control over how long messages are stored, as they are ultimately responsible for covering the storage costs.

## Implications of Message Expiry

When a group chat message is deleted before a user has had a chance to read it, that message becomes permanently inaccessible to that user. This is an acceptable trade-off within the system's design philosophy. Users with multiple installations may be able to recover the message from another device that has previously downloaded it. However, in the absence of such redundancy, the message is effectively lost.

If a user fails to maintain an active and valid key package within the system, that user cannot be invited to new groups. Therefore, every active installation should ensure that a fresh key package is always available. A sensible default would be to rotate the key package after seven days of inactivity. Should an installation go offline for an extended period, it must upload a new key package upon returning.

The loss of a group commit message due to retention limits can render the group unreadable to a particular installation. In such cases, the only remedy is to remove and subsequently re-add the affected installation to the group.

It is worth noting that idle groups may not rotate their cryptographic keys for prolonged durations. Consequently, an installation that has also been idle might still retain access to the group. However, this is an edge case and should not influence the overall design. As a best practice, any attempt to revive communication in an idle group should begin with a key rotation.

### User Experience Considerations

While technical solutions can handle many aspects of message expiration, certain usability challenges remain. The user interface must gracefully handle situations where messages have been lost or are undecryptable. Addressing these concerns requires thoughtful UX design, which falls outside the scope of this document.

### Handling Group Re-Entry

One of the most intricate problems in the system involves installations that have lost the chain of epochs associated with a group. This can occur when too many commit messages have expired, leaving the installation unable to decrypt new messages. Since XMTP does not support re-initializing a group, the only viable solution is to remove the outdated installation and reintroduce it.

A further complication arises when multiple installations fall behind simultaneously. This can lead to a fork, where the outdated installations mistakenly form a new group state divergent from the main group. Given the complexity involved, this proposal does not address such scenarios directly. For now, commit messages will be retained indefinitely to avoid these issues.

### Data Retention Guarantees and Trust Assumptions

In a pre-BFT (Byzantine Fault Tolerant) environment, all participating nodes are considered trusted entities. This assumption allows for cooperative enforcement of retention policies. However, if the system evolves to include untrusted or semi-trusted actors, these guarantees break down.

It is important to note that this proposal does not include mechanisms to verify that payloads remain available beyond their intended retention period. Instead, it relies on economic incentives: nodes are motivated to broadcast payloads to the majority of other nodes in order to be compensated via the payer system. Nodes that return online after a long offline period are not guaranteed to retrieve old data, nor is there an incentive for other nodes to assist in this recovery.

## High-Level Implementation Plan

The current, non-BFT implementation of XMTPD assumes that commit messages and identity updates are always persisted. Other messages, including key packages, welcome messages, and chat messages, are subject to the payer-defined retention policy and may be safely deleted after expiration.

The system will implement a dedicated process called `xmtpd-prune`, responsible for deleting expired messages. This process can be triggered by any standard scheduling mechanism, such as `cron`.

There are several key implementation points:

* Messages *must not* be expired until they have been included in a payer report.
* Billing is calculated per day-byte of payload data.
* New database fields must be added to `GatewayEnvelopes` and `StagedOriginatorEnvelope` to store the expiration time in Unix epoch format.
* The protocol between the payer and XMTPD must be extended to support a `RetentionPeriodDays` field.
* The originator node converts the payer-defined retention period into an explicit expiration timestamp using its current perceived time. This expiration timestamp is then attached to the message. Each receiving node, upon evaluating the message, can make an independent decision to expire the message once its local time surpasses the expiration timestamp. While nodes may not be perfectly synchronized in time, this mechanism does not require true clock synchronization, as the expiration logic remains consistent and deterministic within each node's local view of time.
* Originator envelopes must be expanded with the `expiry_unixtime` field

Note: The frequency of running the xmtpd-prune job is intentionally left to the discretion of the node operator, allowing flexibility based on system load and operational preferences. However, operators should be aware that less frequent pruning results in higher storage consumption, which directly impacts storage costs under the byte-hour billing model. As a general recommendation, running the job at least once daily provides a good balance between resource usage and cost efficiency. Operators seeking to minimize storage expenses should consider more frequent scheduling, especially in high-throughput environments.

## Client Requests for Expired Payloads

Because payers can define arbitrary retention periods, and due to the asynchronous nature of message delivery, it is possible for newer messages to expire before older ones. This can result in gaps when clients request messages using cursors. Unfortunately, the backend cannot reliably detect or report these missing messages.

One possible future enhancement is the use of tombstones—lightweight placeholders that indicate a message has been deleted. These could eventually be purged once all messages from the relevant time period have expired. However, implementing such a feature would add significant complexity and is not part of this proposal.

## Handling Extreme Retention Settings

If a payer specifies an extremely short retention period, such as zero or one day, special rules apply. Messages cannot be deleted until they have been included in a payer report, which occurs twice daily. Therefore, the minimum effective retention period is 24 hours. Any message with a declared retention of zero days will be rejected by XMTPD.

On the other end of the spectrum, a payer might request very long retention, such as multiple years. Since storage costs are dynamic and may increase, excessively long retention can lead to unexpectedly high bills. To protect users, the system will cap the maximum allowable retention period at 365 days. Requests that exceed this threshold will also be rejected.

## Future Improvements and Extensions

An early expiration strategy for key packages could be implemented. Once a new key package has been uploaded for the same installation, the older one may be deemed used and expired. Although nodes may see these changes at different times, this inconsistency is manageable, as any unexpired key package remains valid for contact.

For welcome messages, early expiration is more challenging. It is difficult to confirm whether a welcome message has been processed, especially when the associated key package might not yet have reached the node. Even if the key package has been deleted, the welcome message might still be valid, as it can still reach the installation. Therefore, premature deletion should be avoided. However, payers can mitigate storage costs by configuring a shorter retention window, such as seven days.

Another long-term goal is to unify the payment mechanisms across all message types within XMTPD. Currently, chat messages are paid for using the dedicated payer system, while metadata and identity-related messages require direct gas payments to be submitted on-chain. This bifurcation introduces complexity for developers and payers alike. Unifying these systems would simplify the economic model, streamline message submission and billing workflows, and create a more consistent and developer-friendly interface. Exploring this unification will be a focus of future protocol design iterations.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
