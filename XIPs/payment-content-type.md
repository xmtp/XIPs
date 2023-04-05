---
Title: Payment and Nfts as content types
Description: Xip for payments and Nfts as content types 
Authors: Shubham Patel (@aeyshubh), Siddharth Shukla (@gunner26735), Krishn Panchal (@phovious14)
Satus: Draft
Suggested-XIP-Number : 3
Type: Standards Track
Category: XRC
Created: 2023-04-04
---

## Abstract

- Payments : Every ERC20 token has a contract address and a token Transfer function ,when the \pay keyword is encountered then we fetch the token name(USDC,MATIC) from the command then it's contract address and call the transfer function with that contract address on behalf of the user,if the user accepts the transfer event in his metamask wallet then the tokens will be treansfered and the transaction link will be sent in the chat.  

Abstract is a multi-sentence (short paragraph) technical summary. This should be a very terse and human-readable version of the specification section. Someone should be able to read only the abstract to get the gist of what this specification does.

## Motivation

- The main goal of this XIP is to improve User Experience and to make your XMTP app `feature rich` so that the user dosen't need to `go out` of the app to do anything.
- It's a bit boredom that to make payments first you have to go to metamask,select token,select amount then enter wallet address ,confirm the wallet address and then send funds ,plus for the transaction link you have to find the transaction in metamask and then go to block explorer and then copy and sent that link in chat,all this process just to pay your friend some bucks...
- With this XIP, you could just do all this in just 1 Line with the friend you are chatting with by sending payment link and it's transaction link `instantly` again with just one line.  

## Specification

- Payments:
    - Must things to implement :
        - The first thing to keep in mind while integrating Payments in your app is the format in which the transfer function will be called.
        - The format we suggest : `\pay [amount] [tokenName]`
        - Eg : \pay 5 usdc ~ it's just like saying Hi,I want to pay you 5 USDC.  
        - To implement the above you could fetch the message from the users side then split it into array using ".split" method in Javascript .
        - The user can write "USDC" or "usdc" or "UsDc" cauz it's user so first you have to convert the given command into lower case and accordingly you fetch the contract address.
        - After splitting you take array[1] and array[2] values which will be the Amount and the token name.
        - From a dictionary you fetch it's chain and the Token's deployed contract addess and call a transfer function on it.
        - Following are steps which you need to go through to call the "transfer" function of a contract.
            1. Create a ABI of ERC20 token,every ERC20 token have same `ABI` ,heres a reference [ABI Reference](https://github.com/aeyshubh/XIP-payment-ref/blob/main/tokenAbi.js "ABI reference"),you could use this ABI too.
            2. Import it into the file in which you want to call the transfer function.
            3. Create a variable for storing the token contract address of the token on which you want to call the token transfer event. Syntax :  const tokenAddress = '0xc94dd466416A7dFE166aB2cF916D3875C049EBB7';
            4. Create a contract reference variable for calling the transfer function of the Token's contract. Syntax : const tokenContract = new ethers.Contract(tokenAddress, abi2, signer);
            5. Next up ,you will call the `transfer` function in which _receiver will be the address of the person you are chatting with and _amount is the amount user wants to send which can be fetched by array[2] . Syntax : const writen = await tokenContract.transfer(_receiver, ethers.utils.parseEther(_amount));
            6. The transfer function will return a promise and on completion of the promise you can get the hash of the transaction to prove your payment . Syntax : console.log("Payment Hash" + writen.hash);
    - One very important thing which you need to keep in mind is the Chain which the user is on,If the Token address is of Polygon chain and the user is on Ethereum chain then the transaction will go through but it would fail eventually and the gas would be wasted.
    - So if the user is on Ethereum chain then the token Address ahould be of Ethereum chain.
    - A format like this should be followed :
       ```protobuf 
       chains={
            1:{
                "usdc":"Contract Address",
                "dai":"Contract Address",
                "wbtc":"Contract Address"
            },
            137:{
                "usdc":"Contract Address",
                "dai":"Contract Address",
                "wbtc":"Contract Address"
            }
        }
        ```
    - When User connects the wallet you can get the Chain Id and get the contract address accordingly .
    

## Rationale

- We went with the command format insted of UI because it can get complicated while making the UI wheres it's easier to use commands.
- The users of web3 Application are quite tech savy and familiar with discord in which /commands are used to trigger various events .

## Backwards Compatibility

- The only Compatibilatiy issue which can happen is the Chain compatibility and it's solution is also stated in the Specification section i.e to fetch the current chain on which the user is then fetch the token address of the token which the user wants to transfer OF that chain and call the transfer function on it.
- Another Compatibility issue can be the token which the user wants to transfer is not supported on the platform and in this case a error should be thrown.
- There can be a page to hear about User's request to addup a new token into whichever application you are developying[optional].

## Test Cases

- The only testcase the application will fail is the case in which the order of sending the command is changed i.e The correct order is "/pay 5 USDC".
    - The user can mistaken it for "\pay 5 USDC" 
    - "/pya USDC 5"
    - "/pay USDD 5"
    - In such cases An Alert shall be provided specifying the correct order .

## Reference Implementation

Payment Reference Implementation : [Payment Reference code](https://github.com/aeyshubh/XIP-payment-ref/blob/main/sendPayments.js "Javascript payment code")

## Security Considerations

- This XIP is preety much secured as we are calling the already deployed functions of the smart contract.
- Our code dosen't involve any intermediate smart contract through which the payments are going so the User/sender is the sole owner of it's tokens.
- No Approve functions are required for payments or Nfts hence no one on behalf of the sender can trigger specific events.
- For the transaction to go through the sender has to approve it in his Web3 Wallet .

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).