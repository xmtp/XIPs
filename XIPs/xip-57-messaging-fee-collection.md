---
xip: 57
title: Messaging fee collection
description: The system for collecting fees from Payers and metering their spend across offchain message sending
author: Borja Aranda (@fbac), Nick Molnar (@neekolas)
discussions-to: https://community.xmtp.org/t/xip-57-messaging-fee-collection/876
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

$$
\text{fee} = 100 \times \frac{e^x - 1}{e - 1}
$$

- The final congestion fee in dollars would be `fee * C`

### The Payers Contract

- The contract manages **payer balances** (in USDC).
- Payers lock funds in this contract to fund future message sending. They can withdraw any unspent funds with a 48-hour waiting period.
- Nodes reach consensus on how many messages have been sent by each payer through [Payer Reports](#payer-reports). The funded amount minus any settled usage is the Payer’s available balance.
- Payer deposits have a minimum size of $10 USDC.

#### Payers Contract interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title IPayer
 * @notice Interface for managing payer USDC deposits, usage settlements,
 *         and a secure withdrawal process.
 */
interface IPayer {
    //==============================================================
    //                             STRUCTS
    //==============================================================

    /**
     * @dev Struct to store payer information.
     * @param balance The current USDC balance of the payer.
     * @param isActive Indicates whether the payer is active.
     * @param creationTimestamp The timestamp when the payer was first registered.
     * @param latestDepositTimestamp The timestamp of the most recent deposit.
     * @param debtAmount The amount of fees owed but not yet settled.
     */
    struct Payer {
        uint256 balance;
        bool isActive;
        uint256 creationTimestamp;
        uint256 latestDepositTimestamp;
        uint256 debtAmount;
    }

    /**
     * @dev Struct to store withdrawal request information.
     * @param requestTimestamp The timestamp when the withdrawal was requested.
     * @param withdrawableTimestamp The timestamp when the withdrawal can be finalized.
     * @param amount The amount requested for withdrawal.
     */
    struct Withdrawal {
        uint256 requestTimestamp;
        uint256 withdrawableTimestamp;
        uint256 amount;
    }

    //==============================================================
    //                             EVENTS
    //==============================================================

    /// @dev Emitted when a new payer is registered.
    event PayerRegistered(address indexed payer, uint256 amount);

    /// @dev Emitted when a payer is deactivated by an owner.
    event PayerDeactivated(address indexed payer);

    /// @dev Emitted when a payer is permanently deleted from the system.
    event PayerDeleted(address indexed payer, uint256 timestamp);

    /// @dev Emitted when a deposit is made to a payer's account.
    event Deposit(address indexed payer, uint256 amount);

    /// @dev Emitted when a user donates to a payer's account.
    event Donation(address indexed donor, address indexed payer, uint256 amount);

    /// @dev Emitted when a payer initiates a withdrawal request.
    event WithdrawalRequest(address indexed payer, uint256 requestTimestamp, uint256 withdrawableTimestamp, uint256 amount);

    /// @dev Emitted when a payer cancels a withdrawal request.
    event WithdrawalCancelled(address indexed payer);

    /// @dev Emitted when a payer's withdrawal is finalized.
    event WithdrawalFinalized(address indexed payer, uint256 amountReturned);

    /// @dev Emitted when usage is settled and fees are calculated.
    event UsageSettled(uint256 fees, address indexed payer, uint256 indexed nodeId, uint256 timestamp);

    /// @dev Emitted when batch usage is settled.
    event BatchUsageSettled(uint256 totalFees, uint256 indexed nodeId, uint256 timestamp);

    /// @dev Emitted when fees are transferred to the rewards contract.
    event FeesTransferred(uint256 amount);

    /// @dev Emitted when the rewards contract address is updated.
    event RewardsContractUpdated(address indexed newRewardsContract);

    /// @dev Emitted when the nodes contract address is updated.
    event NodesContractUpdated(address indexed newNodesContract);

    /// @dev Emitted when the minimum deposit amount is updated.
    event MinimumDepositUpdated(uint256 newMinimumDeposit);

    /// @dev Emitted when the pause is triggered by `account`.
    event Paused(address account);

    /// @dev Emitted when the pause is lifted by `account`.
    event Unpaused(address account);

    //==============================================================
    //                             ERRORS
    //==============================================================

    /// @dev Error thrown when caller is not an authorized node operator.
    error UnauthorizedNodeOperator();

    /// @dev Error thrown when caller is not the rewards contract.
    error NotRewardsContract();

    /// @dev Error thrown when an address is invalid (usually zero address).
    error InvalidAddress();

    /// @dev Error thrown when the amount is insufficient.
    error InsufficientAmount();

    /// @dev Error thrown when a withdrawal is not in the requested state.
    error WithdrawalNotRequested();

    /// @dev Error thrown when a withdrawal is already in progress.
    error WithdrawalAlreadyRequested();

    /// @dev Error thrown when a lock period has not yet elapsed.
    error LockPeriodNotElapsed();

    /// @dev Error thrown when arrays have mismatched lengths.
    error ArrayLengthMismatch();

    /// @dev Error thrown when trying to backdate settlement too far.
    error InvalidSettlementTime();

    /// @dev Error thrown when trying to delete a payer with balance or debt.
    error PayerHasBalanceOrDebt();

    /// @dev Error thrown when trying to delete a payer in withdrawal state.
    error PayerInWithdrawal();

    //==============================================================
    //                      PAYER REGISTRATION & MANAGEMENT
    //==============================================================

    /**
     * @notice Registers the caller as a new payer upon depositing the minimum required USDC.
     *         The caller must approve this contract to spend USDC beforehand.
     * @param amount The amount of USDC to deposit (must be at least the minimum required).
     *
     * Emits `PayerRegistered`.
     */
    function register(uint256 amount) external;

    /**
     * @notice Allows the caller to deposit USDC into their own payer account.
     *         The caller must approve this contract to spend USDC beforehand.
     * @param amount The amount of USDC to deposit.
     *
     * Emits `Deposit`.
     */
    function deposit(uint256 amount) external;

    /**
     * @notice Allows anyone to donate USDC to an existing payer's account.
     *         The sender must approve this contract to spend USDC beforehand.
     * @param payer The address of the payer receiving the donation.
     * @param amount The amount of USDC to donate.
     *
     * Emits `Donation`.
     */
    function donate(address payer, uint256 amount) external;

    /**
     * @notice Deactivates a payer, preventing them from initiating new transactions.
     *         Only callable by authorized node operators.
     * @param payer The address of the payer to deactivate.
     *
     * Emits `PayerDeactivated`.
     */
    function deactivatePayer(address payer) external;

    /**
     * @notice Permanently deletes a payer from the system.
     * @dev Can only delete payers with zero balance and zero debt who are not in withdrawal.
     *      Only callable by authorized node operators.
     * @param payer The address of the payer to delete.
     *
     * Emits `PayerDeleted`.
     */
    function deletePayer(address payer) external;

    /**
     * @notice Checks if a given address is an active payer.
     * @param payer The address to check.
     * @return isActive True if the address is an active payer, false otherwise.
     */
    function getIsActivePayer(address payer) external view returns (bool isActive);

    /**
     * @notice Retrieves the minimum deposit amount required to register as a payer.
     * @return minimumDeposit The minimum deposit amount in USDC.
     */
    function getMinimumDeposit() external view returns (uint256 minimumDeposit);

    /**
     * @notice Updates the minimum deposit amount required for registration.
     * @param newMinimumDeposit The new minimum deposit amount.
     *
     * Emits `MinimumDepositUpdated`.
     */
    function setMinimumDeposit(uint256 newMinimumDeposit) external;

    //==============================================================
    //                      PAYER BALANCE MANAGEMENT
    //==============================================================

    /**
     * @notice Retrieves the current total balance of a given payer.
     * @param payer The address of the payer.
     * @return balance The current balance of the payer.
     */
    function getPayerBalance(address payer) external view returns (uint256 balance);

    /**
     * @notice Initiates a withdrawal request for the caller.
     *         - Sets the payer into withdrawal mode (no further usage allowed).
     *         - Records a timestamp for the withdrawal lock period.
     * @param amount The amount to withdraw (can be less than or equal to current balance).
     *
     * Emits `WithdrawalRequest`.
     */
    function requestWithdrawal(uint256 amount) external;

    /**
     * @notice Cancels a previously requested withdrawal, removing withdrawal mode.
     * @dev Only callable by the payer who initiated the withdrawal.
     *
     * Emits `WithdrawalCancelled`.
     */
    function cancelWithdrawal() external;

    /**
     * @notice Finalizes a payer's withdrawal after the lock period has elapsed.
     *         - Accounts for any pending usage during the lock.
     *         - Returns the unspent balance to the payer.
     *
     * Emits `WithdrawalFinalized`.
     */
    function finalizeWithdrawal() external;

    /**
     * @notice Checks if a payer is currently in withdrawal mode and the timestamp
     *         when they initiated the withdrawal.
     * @param payer The address to check.
     * @return inWithdrawal True if in withdrawal mode, false otherwise.
     * @return requestTimestamp The timestamp when `requestWithdrawal()` was called.
     * @return withdrawableTimestamp When the withdrawal can be finalized.
     * @return amount The amount requested for withdrawal.
     */
    function getWithdrawalStatus(address payer)
        external
        view
        returns (bool inWithdrawal, uint256 requestTimestamp, uint256 withdrawableTimestamp, uint256 amount);

    /**
     * @notice Returns the duration of the lock period required before a withdrawal
     *         can be finalized.
     * @return The lock period in seconds.
     */
    function getWithdrawalLockPeriod() external view returns (uint256);

    //==============================================================
    //                       USAGE SETTLEMENT
    //==============================================================

    /**
     * @notice Called by node operators to settle usage and calculate fees owed.
     * @dev This function is EIP-2200 optimized by using accumulators for multiple state updates.
     * @param fees The total USDC fees computed from this usage period.
     * @param payer The address of the payer being charged.
     * @param nodeId The ID of the node operator submitting the usage.
     * @param timestamp The timestamp when the usage occurred (can be backdated).
     *
     * Emits `UsageSettled`.
     */
    function settleUsage(
        uint256 fees,
        address payer,
        uint256 nodeId,
        uint256 timestamp
    ) external;

    /**
     * @notice Called by node operators to settle usage for multiple payers in a batch.
     * @dev Uses EIP-2200 optimizations for storage efficiency.
     * @param payers Array of payer addresses being charged.
     * @param fees Array of USDC fees corresponding to each payer.
     * @param timestamp When this batch of usage occurred (can be backdated).
     * @param nodeId The ID of the node operator submitting the usage.
     *
     * Emits `BatchUsageSettled` and multiple `UsageSettled` events.
     */
    function settleUsageBatch(
        address[] calldata payers,
        uint256[] calldata fees,
        uint256 timestamp,
        uint256 nodeId
    ) external;

    /**
     * @notice Retrieves the total pending fees that have not yet been transferred
     *         to the rewards contract.
     * @return pending The total pending fees in USDC.
     */
    function getPendingFees() external view returns (uint256 pending);

    /**
     * @notice Transfers all pending fees to the designated rewards contract for
     *         distribution using EIP-2200 optimizations.
     * @dev Uses a single storage write for updating accumulated fees.
     *
     * Emits `FeesTransferred`.
     */
    function transferFeesToRewards() external;

    /**
     * @notice Returns the maximum allowed time difference for backdated settlements.
     * @return The maximum allowed time difference in seconds.
     */
    function getMaxBackdatedTime() external view returns (uint256);

    //==============================================================
    //                       OBSERVABILITY FUNCTIONS
    //==============================================================

    /**
     * @notice Returns the total value locked in the contract (all payer balances).
     * @return tvl The total value locked in USDC.
     */
    function getTotalValueLocked() external view returns (uint256 tvl);

    /**
     * @notice Returns the total outstanding debt amount across all payers.
     * @return totalDebt The total debt amount in USDC.
     */
    function getTotalDebtAmount() external view returns (uint256 totalDebt);

    /**
     * @notice Returns the total number of registered payers.
     * @return count The total number of registered payers.
     */
    function getTotalPayerCount() external view returns (uint256 count);

    /**
     * @notice Returns the number of active payers.
     * @return count The number of active payers.
     */
    function getActivePayerCount() external view returns (uint256 count);

     /**
     * @notice Returns the timestamp of the last fee transfer to the rewards contract.
     * @return timestamp The last fee transfer timestamp.
     */
    function getLastFeeTransferTimestamp() external view returns (uint256 timestamp);

    /**
     * @notice Returns a paginated list of payers with outstanding debt.
     * @param offset Number of payers to skip before starting to return results.
     * @param limit Maximum number of payers to return.
     * @return debtors Array of payer addresses with debt.
     * @return debtAmounts Corresponding debt amounts for each payer.
     * @return totalCount Total number of payers with debt (regardless of pagination).
     */
    function getPayersInDebt(uint256 offset, uint256 limit) external view returns (
        address[] memory debtors,
        uint256[] memory debtAmounts,
        uint256 totalCount
    );

    /**
     * @notice Returns the actual USDC balance held by the contract.
     * @dev This can be used to verify the contract's accounting is accurate.
     * @return balance The USDC token balance of the contract.
     */
    function getContractBalance() external view returns (uint256 balance);

    //==============================================================
    //                       ADMINISTRATIVE FUNCTIONS
    //==============================================================

    /**
     * @notice Sets the address of the rewards contract.
     * @param _rewardsContract The address of the new rewards contract.
     *
     * Emits `RewardsContractUpdated`.
     */
    function setRewardsContract(address _rewardsContract) external;

    /**
     * @notice Sets the address of the nodes contract for operator verification.
     * @param _nodesContract The address of the new nodes contract.
     *
     * Emits `NodesContractUpdated`.
     */
    function setNodesContract(address _nodesContract) external;

    /**
     * @notice Retrieves the address of the current rewards contract.
     * @return The address of the rewards contract.
     */
    function getRewardsContract() external view returns (address);

    /**
     * @notice Retrieves the address of the current nodes contract.
     * @return The address of the nodes contract.
     */
    function getNodesContract() external view returns (address);

    /**
     * @notice Pauses the contract functions in case of emergency.
     *
     * Emits `Paused()`.
     */
    function pause() external;

    /**
     * @notice Unpauses the contract.
     *
     * Emits `Unpaused()`.
     */
    function unpause() external;

    /**
     * @notice Checks if a given address is an active node operator.
     * @param operator The address to check.
     * @return isActiveNodeOperator True if the address is an active node operator, false otherwise.
     */
    function getIsActiveNodeOperator(address operator) external view returns (bool isActiveNodeOperator);
}
```

### Payer Reports

Payer Reports are how nodes reach consensus on which messages have been sent on the network. Each node in the system is responsible for creating Payer Reports and attesting to valid reports produced by other nodes.

- Each report is scoped to messages originating from a single node.
- Before funds can be settled, a majority of active nodes must attest to a report.
- Nodes are expected to perform validation offchain before attesting to each report, using their local database of messages they have received via replication.
- Reports contain the lesser of: 1,000,000 messages OR 12 hours of usage.
- If a node fails to verify another node’s report, it can create a new report based on its own view of the node’s activity. If that report achieves majority consensus, it becomes the canonical statement of the usage from that node.

#### Payer Reports interface

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
