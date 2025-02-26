---
xip: 57
title: Messaging fee collection
description: The system for collecting fees from Payers and metering their spend across offchain message sending
author: Borja Aranda (@fbac), Nick Molnar (@neekolas)
status: Draft
type: Standards
category: Network
created: 2025-02-19
---

## Abstract

This XIP describes how the decentralized XMTP network intends to meter Payer usage and allow Payers to purchase capacity for more usage.

- The Payers smart contract is the canonical source for the confirmed balances of each user of the network (typically applications paying on behalf of many users).
- The Payer Reports contract is an onchain mechanism for reaching consensus on changes to those balances.

XMTP Nodes interact with these two smart contracts to keep track of payer balances and update them as messages are stored. This system is designed to handle total network throughput of tens of thousands of messages per second and makes some trade-offs to reach that kind of capacity. 

## Motivation

Messaging fees serve two important purposes in the XMTP network: 

1. They provide economic sustainability for Node Operators
2. They protect finite network resources from DOS and abuse. 

Beyond the level to which the network is sustainable, high fees are a bad thing. Our goal is to set fees at the lowest level that achieves sustainability and to continue driving these fees down over time.

## Specification

### Calculating the cost of a message

The cost of a message is divided into three components:

1. A flat per-message fee
2. A fee charged per-byte-day of storage required. A 100-byte message stored for 30 days would be calculated as 3,000-byte-days.
3. A congestion fee, which is computed by looking at the recent activity of an originator

Both the flat per-message cost and the per-byte-day cost are set through protocol governance and stored in a smart contract. These first two fees are combined into a single `baseFee` that can be computed based on the payload’s size and the length of time it needs to be stored for.

The dollar value of the per-message fee, per-byte-day fee, and congestion fee will be stored in a smart contract and remain constant for a specified period of time. These fees can be adjusted through governance.

### Congestion fees

Congestion fees are calculated differently. Each node is responsible for keeping track of its own level of congestion and computing a congestion fee for any new message it originates.

#### Parameters for the congestion fee

- `N`: Target capacity of the node, below which we don’t want to charge congestion fees
- `M`: Maximum capacity of a node
- `C`: Multiplier to convert each unit of congestion into dollars

Fees would be calculated based on a sliding 5-minute window of messages.

#### Fee calculation

- When the message count in the fee calculation window is at or below the target `N`, the fee is 0.
- When the message count is at or above the maximum `M`, the fee is 100.
- Otherwise, we compute a normalized fraction `x` that represents how far above `N` the current count is relative to the gap `M`−`N`. Then, we apply an exponential curve:

    `fee = 100 × (e^x - 1) / (e - 1)`

- The final congestion fee in dollars would be `fee * C`

### The Payers Contract

- The contract manages **payer balances** (in USDC).
- Payers lock funds in this contract to fund future message sending. They can withdraw any unspent funds with a 48-hour waiting period.
- Nodes reach consensus on how many messages have been sent by each payer through [Payer Reports](#payer-reports). The funded amount minus any settled usage is the Payer’s available balance.
- Payer deposits have a minimum size of $10 USDC.

#### Interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IPayer
 * @notice Interface for a contract that manages payer USDC deposits,
 *         asynchronous usage settlement, and a two-step withdrawal process.
 *
 *         Key features:
 *          - Payers deposit USDC upfront via `deposit`.
 *          - Nodes settle usage periodically by submitting a usage record to `settleUsage`.
 *          - Payers can request withdrawal (`requestWithdraw`), entering a lock period
 *            so no new messages can be sent with this payer's balance.
 *          - After the lock period, `finalizeWithdraw` returns the unspent funds to the payer.
 */
interface IPayer {

    //==============================================================
    //                             EVENTS
    //==============================================================

    /// @dev Emitted when a payer deposits USDC.
    event PayerDeposit(
        address indexed payer,
        uint256 amount
    );

    /// @dev Emitted when a payer initiates a withdrawal request.
    event WithdrawRequested(
        address indexed payer,
        uint256 requestTimestamp
    );

    /// @dev Emitted when a payer's withdrawal is finalized.
    ///      The remaining balance is returned to them.
    event WithdrawFinalized(
        address indexed payer,
        uint256 amountReturned
    );

    /// @dev Emitted when usage is settled and fees are calculated.
    event UsageSettled(
        uint256 indexed epochId,
        bytes32 usageDataHash,
        uint256 totalFees
    );

    /// @dev Emitted when fees are transferred to a rewards or treasury contract
    ///      for distribution to node operators.
    event FeesTransferred(uint256 amount);

    //==============================================================
    //                      PAYER BALANCE MANAGEMENT
    //==============================================================

    /**
     * @notice Allows a payer to deposit `amount` USDC for future messaging usage.
     *         The payer must have approved this contract to spend USDC beforehand.
     * @param amount The amount of USDC to deposit.
     */
    function deposit(uint256 amount) external;

    /**
     * @notice Gets the current total balance of a given payer.
     * @dev This includes amounts that might still be subject to pending usage reports.
     * @param payer The address of the payer.
     */
    function getPayerBalance(address payer) external view returns (uint256);

    /**
     * @notice Initiates a withdrawal request for the caller.
     *         - Sets the payer into withdrawal mode (no further usage is allowed).
     *         - Records a timestamp for the withdrawal lock period.
     *
     * Emits `WithdrawRequested`.
     */
    function requestWithdraw() external;

    /**
     * @notice Finalizes a payer's withdrawal after the lock period has elapsed.
     *         - Accounts for any pending usage that arrived during the lock.
     *         - Returns the unspent balance to the payer.
     *
     * Emits `WithdrawFinalized`.
     */
    function finalizeWithdraw() external;

    /**
     * @notice Returns whether a payer is currently in the withdrawal mode,
     *         plus the time at which they initiated withdrawal (if any).
     * @param payer The address of the payer.
     * @return inWithdrawal True if in withdrawal mode, false otherwise.
     * @return requestTimestamp The timestamp when `requestWithdraw()` was called.
     */
    function getWithdrawalStatus(address payer)
        external
        view
        returns (bool inWithdrawal, uint256 requestTimestamp);

    /**
     * @notice Returns the length of the lock period (e.g., 12 or 24 hours).
     *         This is how long a payer must wait after `requestWithdraw()`
     *         before calling `finalizeWithdraw()`.
     * @dev Could be a constant in the implementation.
     */
    function getLockPeriod() external view returns (uint256);

    //==============================================================
    //                       USAGE SETTLEMENT
    //==============================================================

    /**
     * @notice Called periodically (e.g. every 12 hours) after off-chain attestations
     *         to settle usage and calculate how much total fees are owed.
     * @param epochId       An ID or timestamp representing the usage window being settled.
     * @param usageDataHash A keccak256 hash referencing the underlying usage data.
     * @param totalFees     The total USDC fees computed from this usage window.
     *
     * Emits `UsageSettled`.
     */
    function settleUsage(
        uint256 reportId,
        bytes32 usageDataHash,
        uint256 totalFees
    ) external;

    /**
     * @notice Returns how many fees have been accumulated from usage but not yet
     *         transferred to the rewards or treasury contract.
     * @return pending Total pending fees (in USDC) that have not been forwarded yet.
     */
    function pendingFees() external view returns (uint256);

    /**
     * @notice Transfers all pending fees to a designated contract (e.g., a Rewards or Treasury contract),
     *         which will then distribute them among node operators.
     *
     * Emits `FeesTransferred`.
     */
    function transferFeesToRewards() external;
}

```

### Payer Reports

Payer Reports are how nodes reach consensus on which messages have been sent on the network. Each node in the system is responsible for creating Payer Reports and attesting to valid reports produced by other nodes. 

- Each report is scoped to messages originating from a single node.
- Before funds can be settled, a majority of active nodes must attest to a report.
- Nodes are expected to perform validation offchain before attesting to each report, using their local database of messages they have received via replication.
- Reports contain the lesser of: 1,000,000 messages OR 12 hours of usage.
- If a node fails to verify another node’s report, it can create a new report based on its own view of the node’s activity. If that report achieves majority consensus, it becomes the canonical statement of the usage from that node.

#### Interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IPayerReports {
		/**
     * @dev Emitted when a node (originator) publishes a usage report
     *      containing (payer => usageSpent) for the last 12-hour period.
     */
    event PayerReportSubmitted(
        address indexed originatorNode,
        uint256 indexed reportIndex,
        uint256 startingSequenceID,
        uint256 endingSequenceID,
        uint256 lastMessageTimestamp,
        uint256 reportTimestamp,
        address[] payers,
        uint256[] amountsSpent
    );

    /**
     * @dev Emitted when a node (or any validator) attests to the correctness
     *      of a usage report.
     */
    event PayerReportAttested(
        address indexed originatorNode,
        uint256 indexed reportIndex,
        address attester
    );

    /**
     * @dev Emitted when a usage report is confirmed (majority attestation),
     *      and final usage is processed for distribution.
     */
    event PayerReportConfirmed(
        address indexed originatorNode,
        uint256 indexed reportIndex
    );
		//==============================================================
	  //                     PAYER REPORT LOGIC                    
	  //==============================================================
    /**
     * @notice Submits a payer report for the node (`originatorNode`) covering
     *         messages from `startingSequenceID` up to `endingSequenceID`.
     *         This directly includes per-payer usage amounts.
     *
     * @param originatorNode The node's address/ID.
     * @param startingSequenceID First message included in the report.
     * @param endingSequenceID  Last message included in the report.
     * @param lastMessageTimestamp The timestamp of the last message in the report.
     * @param reportTimestamp The time the report was generated (≥ 1 hour after lastMessageTimestamp).
     * @param payers An array of payer addresses included in this usage window.
     * @param amountsSpent The usage cost each payer owes (same length as `payers`).
     *
     * Emits `PayerReportSubmitted`.
     */
    function submitPayerReport(
        address originatorNode,
        uint256 startingSequenceID,
        uint256 endingSequenceID,
        uint256 lastMessageTimestamp,
        uint256 reportTimestamp,
        address[] calldata payers,
        uint256[] calldata amountsSpent
    ) external;

    /**
     * @notice Allows other nodes to attest that the usage data is correct.
     *         If enough attestations (majority) are gathered, the report can be confirmed.
     * @param originatorNode The node that submitted the usage report.
     * @param reportIndex The index of the report for that node.
     *
     * Emits `PayerReportAttested`.
     */
    function attestPayerReport(address originatorNode, uint256 reportIndex) external;

    /**
     * @notice Finalizes a usage report once majority attestation is reached.
     *         - For each `(payer => amountSpent)` in the report, calls the Payer contract
     *           to settle usage (deduct from payer balances).
     *         - Marks the report as confirmed.
     *
     * Emits `PayerReportConfirmed`.
     *
     * @param originatorNode The node that submitted the report.
     * @param reportIndex The index of the report to confirm.
     */
    function confirmPayerReport(
        address originatorNode,
        uint256 reportIndex
    ) external;

    /**
     * @notice Fetch info about a specific usage report for reading in frontends or external scripts.
     * @param originatorNode Node that submitted the report.
     * @param reportIndex Index of the report for that node.
     * @return startingSequenceID The first sequence ID covered by this report.
     * @return endingSequenceID   The last sequence ID covered by this report.
     * @return lastMessageTimestamp The timestamp of the last message in the report.
     * @return reportTimestamp    The time the report was generated.
     * @return attestationCount   How many nodes have attested so far.
     * @return isConfirmed        Whether the report is confirmed/finalized.
     *
     * NOTE: This does not return `(payer, amountsSpent)` arrays in full detail to keep
     *       the function simpler. Implementation might have a separate method to query.
     */
    function getPayerReport(
        address originatorNode,
        uint256 reportIndex
    )
        external
        view
        returns (
            uint256 startingSequenceID,
            uint256 endingSequenceID,
            uint256 lastMessageTimestamp,
            uint256 reportTimestamp,
            uint256 attestationCount,
            bool isConfirmed
        );
}
```

### Tracking balances in our nodes

Originators must make decisions on whether to accept or reject a given message in real-time. Rather than force the network to reach consensus on whether a Payer has sufficient balance to send every message - which adds significant latency and cost - we allow for nodes to perform bookkeeping without consensus for recently received messages. 

We can mitigate the risk of double-spending by forcing Payers to over-provision capacity and by limiting the percentage of available capacity a Payer may spend in a single period.

#### Settled balances

All nodes are expected to index the Payers contract to maintain a ledger of paid-for messaging capacity for each Payer, as well as fee accrual that has been confirmed through consensus (see [Payer Reports](#payer-reports)).

The difference between **funded capacity** (how much has been deposited in the smart contract) and **settled usage** is each Payer’s **confirmed balance**.

#### Unsettled usage

As messages are received through replication or origination, each node must update its internal running total of fees accrued per payer/originator since the last settled balance update. Nodes should store these balances pre-aggregated per minute so that total spend can be calculated efficiently in real-time.

The following database schema should allow for efficient updates to these balances as messages are processed:

```sql
CREATE TABLE unsettled_usage(
	payer_id INTEGER NOT NULL,
	originator_id INTEGER NOT NULL,
	minutes_since_epoch INTEGER NOT NULL,
	spend BIGINT NOT NULL, -- spend is in microcents with 6 decimal precision to match the USDC contract
	PRIMARY KEY (payer_id, originator_id, minutes_since_epoch)
);
```

#### Rejecting messages

Originators must reject any message where `SETTLED_BALANCE - UNCONFIRMED_USAGE > SETTLED_BALANCE / NUMBER_OF_ACTIVE_NODES`. With this safety measure in place, even in a total network partition between all nodes, a Payer would not be able to take their total balance into the negative. 

### Generating and verifying Payer Reports

The process for generating a Payer Report and verifying one is the same.

1. Start the report at the `sequence_id` of the previous report or 0 (if you are creating the first report for an originator).
2. To find an `end_sequence_id` take the smaller of the `sequence_id` that is 1,000,000 messages after the previous report, or the last `sequence_id` 1 minute in the past. The `end_sequence_id` used for the report **must** be the last message processed by the originator in the minute it was reported. This allows for reports to be calculated based on pre-aggregated spending totals instead of requiring nodes to sum the values message by message.
3. Sum all payer fees spent in the minutes after the `starting_sequence_id` and inclusive of the minute containing the`ending_sequence_id` grouped by Payer and filtering usage for a single originator.

## Rationale

The goal with this design is to move as much of the bookkeeping offchain as possible for efficiency. This is cheaper than onchain bookkeeping by many orders of magnitude since each onchain report may span as many as 1 million messages. Doing more bookkeeping onchain (for example, by making the reports smaller or even shrinking them to cover a single message) would give us more reliable Payer balances but at a significant cost to users.

One consequence of this trade-off is that Payers are not able to spend their entire available balance in one payment epoch, and as their balance dwindles, their spending capacity per day will shrink further. This means that high-volume senders will need to maintain a balance in the contract that covers some multiple of their intended daily sending. Hopefully, tooling can emerge to notify Payers that their balance is too low and should be topped up.

## Backward compatibility

This work will be rolled out in three phases to minimize impact on the testnet.

1. Tracking payer balances on the nodes and submitting reports but not rejecting messages where the payer’s available balance is below 0.
2. Nodes start attesting to reports and indexing the confirmed balances.
3. Rejecting messages where the Payer’s available balance is insufficient.

## Security considerations

- Only the canonical Payer Reports contract is allowed to call `settleUsage` on the Payer Report. This prevents unauthorized usage being recorded for Payers
- Because Payer usage is not accounted for in real-time, the withdrawal locking period must be long enough to ensure all Payer Reports impacting the withdrawing user are handled.
- If nodes are unable to come to consensus on any Payer Report for a given originator, no balances are ever settled, and nodes must rely on unconfirmed usage.
- A malicious node may send different payloads or subsets of payloads to other nodes on the network, preventing consensus from ever being reached. This should be automatically detected and become the basis for a misbehaviour report.
- If the list of payers and balances exceeds the maximum size for an Ethereum transaction, the system could become deadlocked, and no new reports can be created. We must design a way to break a payer report into smaller units if required.

### Threat model

- Node operators may attempt to collude to charge Payers for more than their actual usage. We may need to design additional protections to detect this kind of behaviour.
- Payers may attempt to exploit race conditions in message replication to spend more than their available balance by sending a large volume of messages to many nodes very quickly.
- Node operators can save on costs by not verifying Payer Reports before attesting. We need to have appropriate disincentives for this behaviour (for example, applying penalties to nodes that attest to reports that do not become canonical).

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
