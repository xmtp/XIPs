---
xip: 77
title: Automatic agent removal from inactive groups
description: Proposes automatic removal of agents/bots from groups after a period of inactivity to reduce unnecessary message processing and database growth.
author: Mojtaba Chenani (@mchenani)
discussions-to: TBD
status: Draft
type: Standards
category: XRC
created: 2025-11-10
---

## Abstract

This XIP proposes a mechanism for automatically removing agents (bots) from group conversations and direct messages after a period of inactivity. When an agent is not actively being used in a conversation, it can self-remove to reduce unnecessary message processing, database growth, and resource consumption. The agent can be re-added when needed again.

## Motivation

When users add agents to group conversations or direct messages, they often forget about them, leaving agents permanently present where they may no longer be needed. This creates several problems:

1. **Privacy and security concerns**: Agents continue to receive and decrypt every message, even when not being actively used, potentially exposing sensitive conversations to unnecessary third-party processing.

2. **Stream connection overhead**: Inactive agents maintain persistent stream connections to receive messages, consuming connection capacity on both the agent infrastructure and the network. Removing unused agents reduces the number of active streams.

3. **Agent resource waste**: Agents must process every message and group update, consuming compute resources, bandwidth, and storage for conversations where they provide no value.

4. **Database bloat**: Agent databases grow continuously with messages from conversations where the agent is no longer actively used, increasing storage costs and degrading query performance.

5. **Group capacity constraints**: Inactive agents occupy member slots in groups, potentially preventing active users from joining groups that have member limits.

6. **Poor user experience**: Conversations with dormant agents may appear cluttered, and users may be unaware that inactive agents are still receiving their messages.

Implementing automatic agent removal improves privacy, reduces agent resource consumption, frees up group capacity, and provides a better user experience. While removing and re-adding agents does incur commit costs on the network, this trade-off is worthwhile for agents that remain inactive for extended periods, as it prevents continuous unnecessary message processing and stream connections.

## Specification

### Agent inactivity detection

An agent is considered "inactive" in a conversation (group or DM) when:

1. **No mentions**: The agent has not been mentioned (via `@agent` or similar patterns) in messages for a configurable inactivity period
2. **No responses**: The agent has not sent any messages to the group during the inactivity period
3. **No commands**: No messages containing agent-specific commands or triggers have been sent during the inactivity period

The inactivity period SHOULD be configurable by the agent operator with a recommended default of **7 days**.

### Automatic removal workflow

#### Agent-initiated removal

When an agent detects it has been inactive in a group:

1. **Monitor activity**: The agent tracks its last interaction timestamp for each group conversation
2. **Evaluate inactivity**: Periodically (e.g., daily), check if the inactivity period has elapsed for each group
3. **Send farewell message** (optional): Before leaving, the agent MAY send a notification message explaining it's removing itself due to inactivity
4. **Self-remove**: The agent uses the self-removal mechanism from **XIP-75** to leave the group
5. **Clean up local state**: The agent can optionally archive or remove local message history for the group to free storage

```rust
// Pseudocode example
if agent.last_interaction_time(group_id) + INACTIVITY_PERIOD < now() {
    // Optional: Notify group
    group.send_message("I haven't been used recently, so I'm removing myself. Add me back anytime!");

    // Self-remove using XIP-75 mechanism
    group.send_leave_request().await?;

    // Clean up local data
    agent.archive_group_data(group_id).await?;
}
```

#### Admin-initiated removal

Group admins MAY also remove inactive agents manually at any time using standard member removal mechanisms.

### Re-adding agents

When users need the agent again, they can simply re-add it to the group using standard group invitation mechanisms. The agent will:

1. Accept the invitation
2. Optionally send a greeting message
3. Resume normal operations from a fresh state

### Configuration options

Agent operators SHOULD provide configuration for:

- **Inactivity period**: Time threshold before auto-removal (default: 7 days)
- **Farewell messages**: Whether to send notification before leaving
- **Data retention**: Whether to preserve archived group data for potential re-addition
- **Opt-out groups**: Ability to mark specific groups where auto-removal should not occur

## Rationale

### Why agent-initiated removal?

Agent-initiated removal (self-removal) is preferred over protocol-enforced removal because:

1. **Agent autonomy**: Different agents have different use cases and activity patterns. A support bot might need different inactivity thresholds than a notification bot.

2. **Flexibility**: Agent operators can customize inactivity detection logic based on their specific functionality (e.g., some agents may be triggered by keywords, others by direct mentions).

3. **Graceful exit**: Agents can clean up their own state, send farewell messages, and perform any necessary bookkeeping before leaving.

4. **No protocol changes**: This approach leverages existing self-removal mechanisms (XIP-75) without requiring new protocol-level features or validation logic.

### Why not group-initiated removal?

While groups could automatically remove inactive agents, this approach has drawbacks:

- Groups don't have context about whether an agent is "inactive" by design (e.g., a monitoring bot that only responds to specific rare events)
- Protocol-level enforcement would require standardizing what "inactivity" means across all agent types
- Less flexible than allowing agents to implement their own activity detection logic

## Backward compatibility

This XIP builds on **XIP-75 (Self-removal)** and requires no protocol changes. Agents that don't implement auto-removal will continue to function normally, remaining in groups indefinitely. Clients and groups that don't support this feature are unaffected.

## Security considerations

**Malicious agent behavior**: A malicious agent could ignore inactivity periods and remain in groups indefinitely. However, this is no different from the current behavior, and group admins can manually remove such agents.

**Re-adding attacks**: A malicious user could repeatedly add and remove an agent to create spam. This is mitigated by existing group permission systems—only members with appropriate permissions can add new members.

**Data retention concerns**: Agents should clearly document their data retention policies, especially whether they archive messages from groups after auto-removal. Users should be informed that re-adding an agent may not restore previous conversation context.

## Privacy considerations

**Message access transparency**: Users should be informed when agents auto-remove themselves, so they understand the agent is no longer receiving their messages. Farewell messages serve this purpose.

**Historical access**: Even after auto-removal, agents may retain historical message data unless they implement data deletion. Agent operators should provide clear privacy policies about data retention.

## Implementation notes

### Activity detection patterns

Agents can detect activity through various patterns:

- **Mentions**: Regex patterns matching `@agent-name` or `/command`
- **Keywords**: Domain-specific trigger words or phrases
- **Direct replies**: Messages replying to the agent's previous messages
- **Custom logic**: Agent-specific detection based on message content analysis

### Storage optimization

Upon auto-removal, agents can:

- Archive group data to cold storage
- Delete message content while preserving minimal metadata (message count, last interaction time)
- Completely purge group data if no re-addition is expected

### Monitoring and analytics

Agent operators should track:

- Auto-removal frequency per group
- Re-addition rates (how often removed agents are re-added)
- Average inactive period before removal
- Resource savings from reduced message processing

## Open questions

1. Should there be a minimum group age before auto-removal is allowed (e.g., don't auto-remove from groups less than 24 hours old)?

2. Should agents send a "warning" message before auto-removing (e.g., "I'll remove myself in 24 hours if not used")?

3. Should there be standardized activity detection patterns, or should this be entirely agent-specific?

4. Should the protocol provide a way for groups to indicate "keep this agent" to prevent auto-removal?

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
