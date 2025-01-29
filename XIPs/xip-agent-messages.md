# XIP-X: Agent Messages

- xip: X
- title: Agent Messages
- description: A way to help differentiate a agents messages from a humans message
- author: Naomi Plasterer (@nplasterer), Fabri Guespe (@humanagent)
- status: Draft
- type: Standards track
- category: XRCX
- created: 2025-01-27

## **Abstract**

This XRC proposes several options for allowing senders to differentiate a agents messages from a humans message.

## **Motivation**

With the growing popularity of Agents on the internet it may become a common place for bots to want to identify themselves as a bot. This way integrators can display bot messages differently in UI making it clear the person you are talking to is not human. And if a bot is detected that does not identify themselves as a bot it can seem more untrustworthy to users.

## **Specification**

Proposal 1: A Agent Message content type:

```
{
  authorityId: "xmtp.org"
  typeId: "agentMessage"
  versionMajor: 0
  versionMinor: 1
}
```

This would be the same as a text message where the fallback and content would be the same that way even apps that don’t support displaying `agentMessages` differently would still see the messages correctly

Proposal 2: A additional field set on all messages for self election as a bot on send. Would default to false if not set.

```jsx
group.send("Gm I'm a bot", isAgent: true)
```

Proposal 3: A agents election to identifying as a bot could happen at the client creation and not at each send message so instead it would be

```jsx
client.create(signer, clientOptions {isAgent: true})
group.send("Gm I'm a bot")
client.isAgent?(message.sender) // returns true or false if the user who sent the message identifies as an agent 
```

Taking this a step further we could allow this at the identity level for the inboxId. So that it would be identifiable easily to any other inbox that this inbox is a bot. 

## **Backward compatibility**

Clients encountering messages of this type must already be able to deal with messages of an unknown content type, so whatever considerations they're making there should work here too.

## **Reference implementation**

- https://github.com/ephemeraHQ/xmtp-agents/blob/main/packages/agent-starter/src/content-types/agent-message.ts

## **Security considerations**

Can this be abused by humans acting as bots or bots acting as humans who don’t choose to elect themselves as a bot?

## **Copyright**

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
