---
title: On-chain transaction reference content type
description: Provides an on-chain transaction hash or ID sent as a message.
author: @rygine (Ry Racherbaumer), @lourou (Louis Rouffineau), @nmalzieu (Noé Malzieu), @galligan (Matt Galligan), @nakajima (Pat Nakajima), @yash-luna (Yash Lunagaria)
status: Last call
type: Standards
category: XRC
created: 2024-01-26
---

## Abstract

This content type provides a reference to an on-chain transaction, such as a transaction hash or ID, sent as a message, thereby providing a direct link to on-chain activities.

## Motivation

The goal of the transaction reference content type is to provide transaction details in a message, facilitating the sharing of on-chain activities, such as token transfers, between users.

## Specification

### Content type

```json
{
  authorityId: "xmtp.org",
  typeId: "transactionReference",
  versionMajor: 1,
  versionMinor: 0,
}
```

### Transaction reference schema

```ts
type TransactionReference = {
  /**
   * The chain ID for the transaction as outlined in EIP-155
   */
  chainId: number;
  /**
   * The networkId for the transaction
   */
  networkId?: number;
  /**
   * The transaction hash
   */
  reference: string;
  /**
   * Optional metadata object
   */
  metadata?: {
    transactionType: string;
    currency: string;
    amount: bigint;
    decimals: number;
    fromAddress: string;
    toAddress: string;
  };
};
```

## Rationale

The `chainId` provides details of the network used for the transaction as defined in [EIP-155](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md), while the `reference` field contains the hash of the transaction on the network. These two fields should be enough to display a basic reference to the transaction. An optional `networkId` field can be used when it differs from the `chainId`.

In addition, optional `metadata` can be added to provide more details and a richer display of the transaction.

## Backward compatibility

To maintain backward compatibility, a content fallback is stored in the codec as text — ensuring that the intent of the transaction reference content type is conveyed even in non-supporting clients.

## Test cases

Test cases will validate the interpretation of schema type and effective use of a content fallback. These are essential for ensuring interoperability across XMTP platforms.

## Reference implementation

You can find a WIP reference implementation of this transaction reference content type in the [xmtp-js-content-types](https://github.com/xmtp/xmtp-js-content-types) repo under the [packages/content-type-transaction-reference](https://github.com/xmtp/xmtp-js-content-types/tree/main/packages/content-type-transaction-reference) directory.

## Security considerations

While there are no known negative security implications in the data of the on-chain transaction reference content type, clients could pass inaccurate or misleading values for these fields. In addition, clients could display inaccurate or misleading values for these fields and/or link to unrelated transactions.

All transactions should be confirmed on their respective blockchain.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
