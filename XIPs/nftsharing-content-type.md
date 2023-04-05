---
Title: NftSharing as content types
Description: Xip for Nft sharing as content types 
Authors: Shubham Patel (@aeyshubh), Siddharth Shukla (@gunner26735), Krishn Panchal (@phovious14)
Satus: Draft
Suggested-XIP-Number : 4
Type: Standards Track
Category: XRC
Created: 2023-04-04
---

## Abstract

- NFT : This module usually fetch all the NFT's of the connected user and display in the separate tab. Currently, only NFT's of Polygon chain are fetched but more can be added as well, to fetch NFT we are using Alchemy. To send an NFT user have to select the NFT and its link will be automatically attached in text box, and by simply clicking on send button the NFT will be Send .And only one NFT can be shared at a time.    


## Motivation

- The main goal of this XIP is to improve User Experience and to make your XMTP app `feature rich` so that the user dosen't need to `go out` of the app to do anything.
- Every one holds NFT either they have purchased it or have won those . Having those NFT won't do much but with this you can show off your NFT's to your friends. Usally there aren't many ways to share your NFT to your social world with this feature we aim to enable user an easy & quick way to share the NFT's within at the platform itself. 
- With this XIP, you only have to select the NFT which you want to share and click send *__viola__* you have shared the NFT.   

## Specification

- NFT Sharing:
    - Must things to implement :
        - First, we have to add the "Nft.jsx" component  which will fetch NFT and display it. 
        - It can be displayed at anywhere.
        - We have also added the code for returning the Link of selected NFT for that we are using an Use State named setLinkToSend & LinkToSend which are declared as a Global Context. 
        - Once User select an NFT we call setLinkToSend useState and set the link but also appending the "/nft". This would help to bifurcate between a normal message and a NFT link.This all are added in NFT.jsx file.
        - example message : /nft https://i.seadn.io/gae/
        - Now only user is required to click on send button to send the NFT.
        - At receiver side we have to slice the string and check wether the starting 4 letters are "\nft" or not if they are then call "NftCard.jsx".
        - Following are steps which you need to go through to implement the NFT sharing module:
            1. Copy a file named [`Nft.jsx`](https://github.com/gunner26735/XIP-NFT_Sharing-ref/blob/main/Nft.jsx "NFT") which will fetch the NFT in which we required a walletAddress and UseState "linkToSend, setLinkToSend" all these should be global context.
            2. Now we only have to set the TextBox when there is some value in `linkToSend` UseState like this 
            ``` protobuf 
                useEffect(()=>{
                if(linkToSend){
                setMsgTxt(linkToSend);
                setLinkToSend("");
                }
            })
            ```
            3. For displaying the NFT Message we required to create a [`Nftcard.jsx`](https://github.com/gunner26735/XIP-NFT_Sharing-ref/blob/main/NftCard.jsx "NFTCard") component this will display the NFT as an image. Here we are slicing the string where 0-4 represent the type of message such as an NFT type. 
            4. Example: 
             ``` protobuf 
            if((msg.content).slice(0,4) === '/nft'){
              return <NftCard key={msg.id} msg={msg} />;
            }
            ```
    - In above all the steps , step 2 & 4 are needed to be added explicitly or everything else are created as an component
    - A format for fetching API keys of different chain for NFT 
    ``` protobuf
    chains={
            1   :"alchemy-api-url",
            137 :"alchemy-api-url"
        }
     ```
    
    
## Rationale

- We went with the command format insted of UI because it can get complicated while making the UI wheres it's easier to use commands.
- The users of web3 Application are quite tech savy and familiar with discord in which /commands are used to trigger various events .

## Backwards Compatibility

- The only Compatibilatiy issue which can happen is the Chain compatibility. As for now only NFT's of Polygon Chain are provided to user for sharing. But this can be solved easily but adding more chains.
- There can be a page to hear about User's request for adding additional chain support such as Arbitrum, Avalanch , etc.[optional].

## Test Cases

- The application will be failed in following cases:
    - when user erase the /nft from textbox 
    - when user erase the link of image 
    - when user append extra text after the link

## Reference Implementation

- NFT Fetching Implementation   : [Nft.jsx](https://github.com/gunner26735/XIP-NFT_Sharing-ref/blob/main/Nft.jsx "NFT")
- NFT Displaying Implementation : [Nftcard.jsx](https://github.com/gunner26735/XIP-NFT_Sharing-ref/blob/main/NftCard.jsx "NFTCard")

## Security Considerations

- This XIP is preety much secured as we are only fetching NFT's of user and sharing the NFT image URL only.
- No Approve functions are required for Nfts hence no issue for any account theft.
- No transaction are required to sign for fetching or sending of the NFT's.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
