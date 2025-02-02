---
xip: 51
title: Agent messages
description: A way to help differentiate agent messages from human messages
authors: Naomi Plasterer (@nplasterer), Fabri Guespe (@humanagent)
discussions-to: https://community.xmtp.org/t/xip-51-agent-messages/865
status: Draft
type: Standards
category: XRC
created: 2025-01-27
---

## Abstract

This XRC proposes several options for allowing senders to differentiate an agent's message from a human's message.

## Motivation

With the growing popularity of agents (bots) on the internet, it may become commonplace for an agent to want to identify itself as an agent. This way, integrators can display agent messages differently in the UI making it clear that the person you are talking to isn't a human. And if an agent is detected and it doesn't identify itself as an agent, it can seem more untrustworthy to users.

## Specification

Proposal 1: An agent message content type:

```json
{
  authorityId: "xmtp.org"
  typeId: "agentMessage"
  versionMajor: 0
  versionMinor: 1
}
```

This would be the same as a text message where the fallback and content would be the same. In this way, even apps that don’t support displaying `agentMessages` differently would still see the messages correctly.

Proposal 2: An additional field set on all messages that enables an agent to self-identity as an agent upon message send. The value defaults to `false` if not set.

```jsx
group.send("Gm I'm a bot", isAgent: true)
```

Proposal 3: Agent self-identification could happen upon client creation and not upon each message send. So instead, it would be:

```jsx
client.create(signer, clientOptions {isAgent: true})
group.send("Gm I'm a bot")
client.isAgent?(message.sender) // returns true or false if the user who sent the message identifies as an agent 
```

Taking this a step further, the protocol could enable agent self-identification at the identity level for the `inboxId`. This would make it easier for any other inbox to identify the inbox as an agent.

## Backward compatibility

Clients encountering messages of this type must already be able to deal with messages of an unknown content type, so whatever considerations they're making there should work here too.

## Reference implementation

- [agent-message.ts](https://github.com/ephemeraHQ/xmtp-agents/blob/main/packages/agent-starter/src/content-types/agent-message.ts)

## Security considerations

Can this feature be abused by a human acting as an agent? Or by an agent acting as a human that doesn’t choose to identify itself as an agent?

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
