---
xip: 
title: Mutable Reactions
description: Implementation for mutable reactions
author: Kunal Mondal
status: Draft 
type: Standards Track
category: XRC
created: 2023-03-29
---

## Abstract

This XRC proposes a new content type for messages that enriches the messaging experience and let's users react with emojis & also change it according to their choice.

## Motivation

When it comes to having a comfortable conversation, reacting to messages with emojis is necessary as it gives users the freedom to express their thoughts in form of emoji without sending a message and also give them an option to change the reaction in according to their will.

## Specification

Note: Many things can be used here. We are showing an example using an [express.js](https://expressjs.com/) server and [socket.io](http://socket.io/)

Sending a reaction to a specific message using a POST request to an API endpoint. The data sent with the request includes the ID of the message being reacted to and the emoji reaction.

```js
POST http://API_ENDPOINT/reactions

// Sample data
{
    reactingToID: "4b5dec6ef2a228f337804426fbee435b115fb83bf132c7fa1f72463e3798bcbd",
    emoji: "🤗",
}
```

Retrieving all the reactions associated with a specific message by sending a GET request to an API endpoint. The endpoint takes the ID of the message as a parameter and returns a list of all the reactions with their respective emojis.

```js
GET http://API_ENDPOINT/reactions/reactingToID

{
    reactingToID: "4b5dec6ef2a228f337804426fbee435b115fb83bf132c7fa1f72463e3798bcbd",
}

//Sample response
{
    reactingToID: "4b5dec6ef2a228f337804426fbee435b115fb83bf132c7fa1f72463e3798bcbd",
    emoji: "🤗",
}
```

Setting up a listener for the "new_reaction" event emitted by the server using socket.io. Whenever a new reaction is added or updated, the callback function is called with the full document of the reaction as an argument.

```js
useEffect(() => {
    socket.on("new_reaction", (reaction: Reaction) => {
       // Do something with the reaction
    })

    return () => {
        socket.off("new_reaction")
    }
}, [socket])
```

## Backward compatibility

All clients encountering reactions should be able to handle the same API endpoint and data models to make requests for sending and retrieving them and also listen for the real-time changes. 


## Security considerations

The current approach for implementing this feature is to use a centralized database. However, this approach comes with certain risks such as being vulnerable to attacks or data breaches.

This is a temporary solution and we should continue to explore decentralized alternatives that provide both the necessary features and security to ensure the safety and privacy of our users.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
