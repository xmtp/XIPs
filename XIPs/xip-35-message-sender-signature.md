---
xip: 35
title: Message sender identifier in topic
description: A system for detecting who sent a message in a topic from the Notification Server
author: Noé Malzieu
status: Draft
type: Standards Track
category: XRC
created: 2023-12-06
---


## Abstract

This XRC proposes to add a signature to public envelopes for messages, that a notification server could use to detect if one of the subscribed users has sent the message and not send him the notification (i.e. avoid receiving notifications for your own messages).

## Motivation

Right now, a message sent in a topic needs to have its payload decoded to understand who sent the message.
When a notification server sees a message in a topic and decides to sent it to one of its subscribers, it has no way to know if the message is from the subscriber or not.
This means a mobile XMTP client will subscribe to a topic then receive notifications for its own messages in the topic.
This would be fine if the XMTP client could just drop the notification after having decoded the payload.
On Apple devices, to be able to decode the payload before showing the notification, we must use a [Notification Service Extension](https://developer.apple.com/documentation/usernotifications/unnotificationserviceextension) - and the only way to drop a notification from a Notification Service Extension is to obtain a specific entitlement from Apple: [com.apple.developer.usernotifications.filtering](https://developer.apple.com/documentation/bundleresources/entitlements/com_apple_developer_usernotifications_filtering)
Obtaining this entitlement from Apple has proven very hard - they might consider XMTP clients too web3, and they just don't provide this entitlement to apps that provide financial services.
Specifically, Coinbase Wallet never managed to obtain this entitlement, and Converse had it for a few months before losing it.

## Specification

The SDKs would generate a private/public key pair for each topic.
The private/public key pair should always be the same for a given user and a given topic - not dependent on installations / SDK language.

Before publishing an envelope on a topic, the SDK would use the topic private key to sign the message payload and attach it to the envelope.

The envelope of a message would be updated to

    message Envelope {
      string content_topic = 1;
      uint64 timestamp_ns = 2;
      bytes message = 3;
      
      optional string signature = 4; // New field added
    }

When the client subscribes to a topic on its notification server, it would also provide the topic public key to the notification server.

When the notification server sees a message in a specific topic, it would do the following

 1. Check if it has clients that have subscribed to this topic
 2. For each client that has subscribed to the topic, try to verify the signature using the public key the client has provided when subscribing to the topic
 3. If the signature is verified, it means that the message was indeed sent by this person (not necessarily from this client) and the notification server can decide wether to send the notification or not (could be a parameter configured by the developper)

## Backwards Compatibility

Notification server should allow subscribing to topics without sending a public key. This client would then receive all notifications.

Notification server should also parse envelopes that don't have any signature.  These messages would be sent to every client that subscribed to the topic, wether they provided a public key for this topic or not.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
