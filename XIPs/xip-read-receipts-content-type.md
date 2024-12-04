---
xip: 
title: Read Receipts Content Type
description: Content type for read receipts
author: Kunal Mondal, Shivraj Goswami
status: Review
type: Standards Track
category: XRC
created: 2023-04-10
---

## Abstract

This XRC proposes a new content type that allows the sender to understand the status of the outgoing messages and marks them as `SENT`, `DELIVERED` and `SEEN`.

## Motivation

The 'Read Receipts' feature allows the users to have a better understanding of their message delivery and reception, improving communication efficiency and reducing the likelihood of miscommunications. Read receipts provide a clear indication of whether a message has been read or not, allowing users to follow up on important messages and reducing the need for additional follow-up messages. This feature not only benefits individual users but also enhances the overall effectiveness and reliability of XMTP messaging, ultimately leading to a more efficient and productive communication experience for all. 

## Specification

Proposed content type:

```js
{
    authorityId: "xmtp.org",
    typeId: "read-receipt",
    versionMajor: 1,
    versionMinor: 0,
}
```

The read receipt must contain the following parameters

1. `messageId` - The id of the message

2. `status` - The status of the read receipt. By default the status of the read receipt is `SENT` when it’s sent to the XMTP network. When sending the read receipts, the status can either be `DELIVERED` or `SEEN` otherwise an error will be thrown. 

```js
{
    messageId: string
    status: string
}
```

Check if the status of the Read Receipt is valid or not

```js
encode(content: ReadReceipt, registry: CodecRegistry): EncodedContent {
        if (content.status !== "DELIVERED" && content.status !== "SEEN") {
            throw new Error("status is not valid !")
        }

        return {
            type: ContentTypeReadReceipt,
            parameters: {
                messageId: content.messageId,
            },
            content: new TextEncoder().encode(content.status),
        }
    }
```

Client-side workflow:

- Upon sending a message through the XMTP network, the default status shown in the frontend is `SENT`.
- Once the peer receives the message in the inbox, a `read-receipt` message is sent back to the sender to indicate that the message is delivered.

In the `onMessageCallback` function, we’ll check the received messages and send a `read-receipt` message back to the sender with status `DELIVERED`

```js
const onMessageCallback = (message: DecodedMessage) => {
            if (
                currentProfile?.ownedBy !== message?.senderAddress
            ) {
                const readReceipt: ReadReceipt = {
                    messageId: message?.id,
                    status: "DELIVERED",
                }

                sendXmtpMessage(readReceipt, ContentTypeReadReceipt)
            }
        }
```

In the `streamMessages` function, the `onMessageCallback` is passed which will trigger every time a new message is received

```js
const streamMessages = async () => {
            closeStream()
            const newStream = await conversation.streamMessages()
            setStream(newStream)
            for await (const msg of newStream) {
                const numAdded = addMessages(conversationKey, [msg])

                if (numAdded > 0) {
                        onMessageCallback(msg)
                }
            }
        }
```

Subsequently, when the message is rendered on the viewport of the recipient's User Interface, another `read-receipt` message with status `SEEN` is sent to notify the sender that the message has been viewed.

```js
useEffect(() => {
        if (
            // Checking if it's a received message
            address !== message.senderAddress &&
            
            // Checking if the message isn't already viewed
            readReceiptStatus !== "SEEN" &&
            
            // Checking if the message is being rendered on the UI
            inView
        ) {
            const readReceipt: ReadReceipt = {
                messageId: message?.id,
                status: "SEEN",
            }

            sendXmtpMessage(readReceipt, ContentTypeReadReceipt)
        }
    }, [inView])
```

Opt-In, Opt-Out

- Using XMTP Topic - A new XMTP topic named Preferences can be created, where we can store the following info about a user’s Read Receipt Preferences

```js
{
  "0x1EDAFE36Fb88eE4683A9A9525c200bE5Ab8A94F3": {
      sent: true,
      delivered: true,
      seen: false
    }
}
```

## Backward compatibility

Clients encountering messages of this type must already be able to deal with messages of an unknown content type, so whatever considerations they're making there should work here too.

## Reference implementation
- [Client implementation reference](https://read-receipts.vercel.app)

## Security considerations

Relying on new messages to determine and mark the previous message’s delivery status is risky and the results may vary depending on the deliverability of the post coming read receipt messages. Any delays / complications in the XMTP network may affect the deliverability of these messages and hence break the entire system of read receipts. 

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
