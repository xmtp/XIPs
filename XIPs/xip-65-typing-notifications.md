---
xip: 65
title: Typing notifications
description: Proposes a way to show a typing indicator in the chat screen indicating that a user is typing a message
author: Naomi Plasterer (@nplasterer)
discussions-to: https://community.xmtp.org/t/xip-65-typing-notifications/929
status: Draft
type: Standards
category: XRC
created: 2025-05-09
---

## Abstract

To make conversations feel more lively, applications would like to show a typing indicator in the chat screen indicating that a user is typing a message.

## Motivation

Messaging can feel one-sided without an indicator that there is a human on the other side reading the message and actively responding, keeping users engaged and in the application.

## Specification

We can take a very similar approach to how we handled ephemeral messages in V2.

First, on message send, we add a new `sendOption` allowing the sender of the message to indicate if this is an ephemeral message. The sender can send this message the second a user starts typing or after a few seconds of typing has gone by.

```kotlin
val ephemeral: Boolean = false
```

Then, on message send, inside the protocol, it checks to see if the message has the "is ephemeral" flag set. If it is, then it updates the topic to send the message to the ephemeral stream by appending an `E` to the topic of the conversation, indicating that this topic is for ephemeral messages.

```kotlin
    val ephemeralTopic: String
        get() = topic.description.replace("/xmtp/mls/1/g-", "/xmtp/mls/1/gE-")
```

Conversations will have the ability to stream these specific ephemeral messages on a conversation directly, using a special stream just for this ephemeral topic of the group.

```kotlin
    fun streamEphemeral(): Flow<Message> {
	    // Streams ephemeral message
    }
```

Since it is a full message, it will allow the consumer of the ephemeral message to know who is typing. This allows us to have some extensibility in the future if we would like to send agent messages that look like they are typing in realtime, as the ephemeral stream could send typing notifications with the actual content of what is being typed.

## Backward compatibility

Since it involves updating send options with an ephemeral check, older clients will not be able to indicate that they are typing.

## Reference implementation

Here is the V2 ephemeral implementation:

- [https://github.com/xmtp/xmtp-android/pull/105](https://github.com/xmtp/xmtp-android/pull/105)

- [https://github.com/xmtp/xmtp-ios/pull/87](https://github.com/xmtp/xmtp-ios/pull/87)

## Security considerations

A malicious app developer could misuse this to send notifications of what you are typing before you send it. But malicious app developers could do much worse, so users should trust the apps they are using for messaging.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
