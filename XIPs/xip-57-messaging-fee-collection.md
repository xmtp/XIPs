---
xip: 57
title: Messaging fee collection
description: The system for collecting fees from Payers and metering their spend across offchain message sending
author: Borja Aranda (@fbac), Nick Molnar (@neekolas)
status: Final
type: Standards
category: Network
created: 2025-02-19
---

## Abstract

This XIP describes how the decentralized XMTP network intends to meter Payer usage and allow Payers to purchase capacity for more usage.

- The Payer Registry smart contract is the canonical source for the confirmed balances of each user of the network (typically applications paying on behalf of many users).
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

import { IMigratable } from "../../abstract/interfaces/IMigratable.sol";
import { IRegistryParametersErrors } from "../../libraries/interfaces/IRegistryParametersErrors.sol";

/**
 * @title  Interface for the Payer Registry.
 * @notice This interface exposes functionality:
 *           - for payers to deposit, request withdrawals, and finalize withdrawals of a fee token,
 *           - for some settler contract to settle usage fees for payers,
 *           - for anyone to send excess fee tokens in the contract to the fee distributor.
 */
interface IPayerRegistry is IMigratable, IRegistryParametersErrors {
    /* ============ Structs ============ */

    /**
     * @notice Represents a payer in the registry.
     * @param  balance               The signed balance of the payer (negative if debt).
     * @param  pendingWithdrawal     The amount of a pending withdrawal, if any.
     * @param  withdrawableTimestamp The timestamp when the pending withdrawal can be finalized.
     */
    struct Payer {
        int104 balance;
        uint96 pendingWithdrawal;
        uint32 withdrawableTimestamp;
        // 24 bits remaining in first slot
    }

    /**
     * @notice Represents a payer and their fee.
     * @param  payer The address a payer.
     * @param  fee   The fee to settle for the payer.
     */
    struct PayerFee {
        address payer;
        uint96 fee;
    }

    /* ============ Events ============ */

    /**
     * @notice Emitted when the settler is updated.
     * @param  settler The address of the new settler.
     */
    event SettlerUpdated(address indexed settler);

    /**
     * @notice Emitted when the fee distributor is updated.
     * @param  feeDistributor The address of the new fee distributor.
     */
    event FeeDistributorUpdated(address indexed feeDistributor);

    /**
     * @notice Emitted when the minimum deposit is updated.
     * @param  minimumDeposit The new minimum deposit amount.
     */
    event MinimumDepositUpdated(uint96 minimumDeposit);

    /**
     * @notice Emitted when the withdraw lock period is updated.
     * @param  withdrawLockPeriod The new withdraw lock period.
     */
    event WithdrawLockPeriodUpdated(uint32 withdrawLockPeriod);

    /**
     * @notice Emitted when a deposit of fee tokens occurs for a payer.
     * @param  payer  The address of the payer.
     * @param  amount The amount of fee tokens deposited.
     */
    event Deposit(address indexed payer, uint96 amount);

    /**
     * @notice Emitted when a withdrawal is requested by a payer.
     * @param  payer                 The address of the payer.
     * @param  amount                The amount of fee tokens requested for withdrawal.
     * @param  withdrawableTimestamp The timestamp when the withdrawal can be finalized.
     */
    event WithdrawalRequested(address indexed payer, uint96 amount, uint32 withdrawableTimestamp);

    /**
     * @notice Emitted when a payer's pending withdrawal is cancelled.
     * @param  payer The address of the payer.
     */
    event WithdrawalCancelled(address indexed payer);

    /**
     * @notice Emitted when a payer's pending withdrawal is finalized.
     * @param  payer The address of the payer.
     */
    event WithdrawalFinalized(address indexed payer);

    /**
     * @notice Emitted when a payer's usage is settled.
     * @param  payer  The address of the payer.
     * @param  amount The amount of fee tokens settled (the fee deducted from their balance).
     */
    event UsageSettled(address indexed payer, uint96 amount);

    /**
     * @notice Emitted when excess fee tokens are transferred to the fee distributor.
     * @param  amount The amount of excess fee tokens transferred.
     */
    event ExcessTransferred(uint96 amount);

    /**
     * @notice Emitted when the pause status is set.
     * @param  paused The new pause status.
     */
    event PauseStatusUpdated(bool indexed paused);

    /* ============ Custom Errors ============ */

    /// @notice Thrown when caller is not the settler.
    error NotSettler();

    /// @notice Thrown when the parameter registry address is being set to zero (i.e. address(0)).
    error ZeroParameterRegistry();

    /// @notice Thrown when the fee token address is being set to zero (i.e. address(0)).
    error ZeroFeeToken();

    /// @notice Thrown when the settler address is being set to zero (i.e. address(0)).
    error ZeroSettler();

    /// @notice Thrown when the fee distributor address is zero (i.e. address(0)).
    error ZeroFeeDistributor();

    /// @notice Thrown when the minimum deposit is being set to 0.
    error ZeroMinimumDeposit();

    /**
     * @notice Thrown when the `ERC20.transferFrom` call fails.
     * @dev    This is an identical redefinition of `SafeTransferLib.TransferFromFailed`.
     */
    error TransferFromFailed();

    /**
     * @notice Thrown when the deposit amount is less than the minimum deposit.
     * @param  amount         The amount of fee tokens being deposited.
     * @param  minimumDeposit The minimum deposit amount.
     */
    error InsufficientDeposit(uint96 amount, uint96 minimumDeposit);

    /// @notice Thrown when a payer has insufficient balance for a withdrawal request.
    error InsufficientBalance();

    /// @notice Thrown when a withdrawal request of zero is made.
    error ZeroWithdrawalAmount();

    /// @notice Thrown when a withdrawal is pending for a payer.
    error PendingWithdrawalExists();

    /// @notice Thrown when a withdrawal is not pending for a payer.
    error NoPendingWithdrawal();

    /**
     * @notice Thrown when trying to finalize a withdrawal before the withdraw lock period has passed.
     * @param  timestamp             The current timestamp.
     * @param  withdrawableTimestamp The timestamp when the withdrawal can be finalized.
     */
    error WithdrawalNotReady(uint32 timestamp, uint32 withdrawableTimestamp);

    /// @notice Thrown when trying to finalize a withdrawal while in debt.
    error PayerInDebt();

    /// @notice Thrown when there is no change to an updated parameter.
    error NoChange();

    /// @notice Thrown when any pausable function is called when the contract is paused.
    error Paused();

    /// @notice Thrown when there is no excess fee tokens to transfer to the fee distributor.
    error NoExcess();

    /// @notice Thrown when the payer is the zero address.
    error ZeroPayer();

    /// @notice Thrown when the recipient is the zero address.
    error ZeroRecipient();

    /* ============ Initialization ============ */

    /**
     * @notice Initializes the contract.
     */
    function initialize() external;

    /* ============ Interactive Functions ============ */

    /**
     * @notice Deposits `amount_` fee tokens into the registry for `payer_`.
     * @param  payer_  The address of the payer.
     * @param  amount_ The amount of fee tokens to deposit.
     */
    function deposit(address payer_, uint96 amount_) external;

    /**
     * @notice Deposits `amount_` fee tokens into the registry for `payer_`, given caller's signed approval.
     * @param  payer_    The address of the payer.
     * @param  amount_   The amount of fee tokens to deposit.
     * @param  deadline_ The deadline of the permit (must be the current or future timestamp).
     * @param  v_        An ECDSA secp256k1 signature parameter (EIP-2612 via EIP-712).
     * @param  r_        An ECDSA secp256k1 signature parameter (EIP-2612 via EIP-712).
     * @param  s_        An ECDSA secp256k1 signature parameter (EIP-2612 via EIP-712).
     */
    function depositWithPermit(
        address payer_,
        uint96 amount_,
        uint256 deadline_,
        uint8 v_,
        bytes32 r_,
        bytes32 s_
    ) external;

    /**
     * @notice Deposits `amount_` fee tokens into the registry for `payer_`, wrapping them from underlying fee tokens.
     * @param  payer_  The address of the payer.
     * @param  amount_ The amount of underlying fee tokens to deposit.
     */
    function depositFromUnderlying(address payer_, uint96 amount_) external;

    /**
     * @notice Deposits `amount_` fee tokens into the registry for `payer_`, wrapping them from underlying fee tokens,
     *         given caller's signed approval.
     * @param  payer_    The address of the payer.
     * @param  amount_   The amount of underlying fee tokens to deposit.
     * @param  deadline_ The deadline of the permit (must be the current or future timestamp).
     * @param  v_        An ECDSA secp256k1 signature parameter (EIP-2612 via EIP-712).
     * @param  r_        An ECDSA secp256k1 signature parameter (EIP-2612 via EIP-712).
     * @param  s_        An ECDSA secp256k1 signature parameter (EIP-2612 via EIP-712).
     */
    function depositFromUnderlyingWithPermit(
        address payer_,
        uint96 amount_,
        uint256 deadline_,
        uint8 v_,
        bytes32 r_,
        bytes32 s_
    ) external;

    /**
     * @notice Requests a withdrawal of `amount_` fee tokens.
     * @param  amount_ The amount of fee tokens to withdraw.
     * @dev    The caller must have enough balance to cover the withdrawal.
     */
    function requestWithdrawal(uint96 amount_) external;

    /// @notice Cancels a pending withdrawal of fee tokens, returning the amount to the balance.
    function cancelWithdrawal() external;

    /**
     * @notice Finalizes a pending withdrawal of fee tokens, transferring the amount to the recipient.
     * @param  recipient_ The address to receive the fee tokens.
     * @dev    The caller must not be currently in debt.
     */
    function finalizeWithdrawal(address recipient_) external;

    /**
     * @notice Finalizes a pending withdrawal of fee tokens, unwrapping the amount into underlying fee tokens to the
     *         recipient.
     * @param  recipient_ The address to receive the underlying fee tokens.
     * @dev    The caller must not be currently in debt.
     */
    function finalizeWithdrawalIntoUnderlying(address recipient_) external;

    /**
     * @notice Settles the usage fees for a list of payers.
     * @param  payerFees_   An array of structs containing the payer and the fee to settle.
     * @return feesSettled_ The total amount of fees settled.
     */
    function settleUsage(PayerFee[] calldata payerFees_) external returns (uint96 feesSettled_);

    /**
     * @notice Sends the excess tokens in the contract to the fee distributor.
     * @return excess_ The amount of excess tokens sent to the fee distributor.
     */
    function sendExcessToFeeDistributor() external returns (uint96 excess_);

    /**
     * @notice Updates the settler of the contract.
     * @dev    Ensures the new settler is not zero (i.e. address(0)).
     */
    function updateSettler() external;

    /**
     * @notice Updates the fee distributor of the contract.
     * @dev    Ensures the new fee distributor is not zero (i.e. address(0)).
     */
    function updateFeeDistributor() external;

    /**
     * @notice Updates the minimum deposit amount.
     * @dev    Ensures the new minimum deposit is not zero (i.e. address(0)).
     */
    function updateMinimumDeposit() external;

    /// @notice Updates the withdraw lock period.
    function updateWithdrawLockPeriod() external;

    /// @notice Updates the pause status.
    function updatePauseStatus() external;

    /* ============ View/Pure Functions ============ */

    /// @notice The parameter registry key used to fetch the settler.
    function settlerParameterKey() external pure returns (string memory key_);

    /// @notice The parameter registry key used to fetch the fee distributor.
    function feeDistributorParameterKey() external pure returns (string memory key_);

    /// @notice The parameter registry key used to fetch the minimum deposit.
    function minimumDepositParameterKey() external pure returns (string memory key_);

    /// @notice The parameter registry key used to fetch the withdraw lock period.
    function withdrawLockPeriodParameterKey() external pure returns (string memory key_);

    /// @notice The parameter registry key used to fetch the paused status.
    function pausedParameterKey() external pure returns (string memory key_);

    /// @notice The parameter registry key used to fetch the migrator.
    function migratorParameterKey() external pure returns (string memory key_);

    /// @notice The address of the parameter registry.
    function parameterRegistry() external view returns (address parameterRegistry_);

    /// @notice The address of the fee token contract used for deposits and withdrawals.
    function feeToken() external view returns (address feeToken_);

    /// @notice The address of the settler that can call `settleUsage`.
    function settler() external view returns (address settler_);

    /// @notice The address of the fee distributor that receives unencumbered fees from usage settlements.
    function feeDistributor() external view returns (address feeDistributor_);

    /// @notice The sum of all payer balances and pending withdrawals.
    function totalDeposits() external view returns (int104 totalDeposits_);

    /// @notice The pause status.
    function paused() external view returns (bool paused_);

    /// @notice The sum of all payer debts.
    function totalDebt() external view returns (uint96 totalDebt_);

    /// @notice The sum of all withdrawable balances (sum of all positive payer balances and pending withdrawals).
    function totalWithdrawable() external view returns (uint96 totalWithdrawable_);

    /// @notice The minimum amount required for any deposit.
    function minimumDeposit() external view returns (uint96 minimumDeposit_);

    /// @notice The withdraw lock period.
    function withdrawLockPeriod() external view returns (uint32 withdrawLockPeriod_);

    /// @notice The amount of excess tokens in the contract that are not withdrawable by payers.
    function excess() external view returns (uint96 excess_);

    /**
     * @notice Returns the balance of a payer.
     * @param  payer_   The address of the payer.
     * @return balance_ The signed balance of the payer (negative if debt).
     */
    function getBalance(address payer_) external view returns (int104 balance_);

    /**
     * @notice Returns the balances of an array of payers.
     * @dev    This is a periphery function for nodes, and is not required for the core protocol.
     * @param  payers_   An array of payer addresses.
     * @return balances_ The signed balances of each payer (negative if debt).
     */
    function getBalances(address[] calldata payers_) external view returns (int104[] memory balances_);

    /**
     * @notice Returns the pending withdrawal of a payer.
     * @param  payer_                 The address of the payer.
     * @return pendingWithdrawal_     The amount of a pending withdrawal, if any.
     * @return withdrawableTimestamp_ The timestamp when the pending withdrawal can be finalized.
     */
    function getPendingWithdrawal(
        address payer_
    ) external view returns (uint96 pendingWithdrawal_, uint32 withdrawableTimestamp_);
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
pragma solidity 0.8.28;

import { IERC5267 } from "../../abstract/interfaces/IERC5267.sol";
import { IMigratable } from "../../abstract/interfaces/IMigratable.sol";
import { IRegistryParametersErrors } from "../../libraries/interfaces/IRegistryParametersErrors.sol";
import { ISequentialMerkleProofsErrors } from "../../libraries/interfaces/ISequentialMerkleProofsErrors.sol";

/**
 * @title  The interface for the Payer Report Manager.
 * @notice This interface exposes functionality for submitting and settling payer reports.
 */
interface IPayerReportManager is IMigratable, IERC5267, IRegistryParametersErrors, ISequentialMerkleProofsErrors {
    /* ============ Structs ============ */

    /**
     * @notice Represents a payer report.
     * @param  startSequenceId     The start sequence ID.
     * @param  endSequenceId       The end sequence ID.
     * @param  endMinuteSinceEpoch The timestamp of the message at `endSequenceId`.
     * @param  feesSettled         The total fees already settled for this report.
     * @param  offset              The next index in the Merkle tree that has yet to be processed/settled.
     * @param  isSettled           Whether the payer report is completely processed/settled.
     * @param  protocolFeeRate     The portion of the fees settled that is reserved for the protocol.
     * @param  payersMerkleRoot    The payers Merkle root.
     * @param  nodeIds             The active node IDs during the reporting period.
     */
    struct PayerReport {
        uint64 startSequenceId;
        uint64 endSequenceId;
        uint32 endMinuteSinceEpoch;
        uint96 feesSettled;
        uint32 offset;
        bool isSettled;
        uint16 protocolFeeRate;
        bytes32 payersMerkleRoot;
        uint32[] nodeIds;
    }

    /**
     * @notice Represents a payer report signature.
     * @param  nodeId    The node ID.
     * @param  signature The signature by the node operator.
     */
    struct PayerReportSignature {
        uint32 nodeId;
        bytes signature;
    }

    /* ============ Events ============ */

    /**
     * @notice Emitted when a payer report is submitted.
     * @param  originatorNodeId    The originator node ID.
     * @param  payerReportIndex    The index of the newly stored report.
     * @param  startSequenceId     The start sequence ID.
     * @param  endSequenceId       The end sequence ID.
     * @param  endMinuteSinceEpoch The timestamp of the message at `endSequenceId`.
     * @param  payersMerkleRoot    The payers Merkle root.
     * @param  nodeIds             The active node IDs during the reporting period.
     * @param  signingNodeIds      The node IDs of the signers of the payer report.
     */
    event PayerReportSubmitted(
        uint32 indexed originatorNodeId,
        uint256 indexed payerReportIndex,
        uint64 startSequenceId,
        uint64 indexed endSequenceId,
        uint32 endMinuteSinceEpoch,
        bytes32 payersMerkleRoot,
        uint32[] nodeIds,
        uint32[] signingNodeIds
    );

    /**
     * @notice Emitted when a subset of a payer report is settled.
     * @param  originatorNodeId The originator node ID.
     * @param  payerReportIndex The payer report index.
     * @param  count            The number of payer fees settled in this subset.
     * @param  remaining        The number of payer fees remaining to be settled.
     * @param  feesSettled      The amount of fees settled in this subset.
     */
    event PayerReportSubsetSettled(
        uint32 indexed originatorNodeId,
        uint256 indexed payerReportIndex,
        uint32 count,
        uint32 remaining,
        uint96 feesSettled
    );

    /**
     * @notice Emitted when the protocol fee rate is updated.
     * @param  protocolFeeRate The new protocol fee rate.
     */
    event ProtocolFeeRateUpdated(uint16 protocolFeeRate);

    /* ============ Custom Errors ============ */

    /// @notice Thrown when the parameter registry address is being set to zero (i.e. address(0)).
    error ZeroParameterRegistry();

    /// @notice Thrown when the node registry address is being set to zero (i.e. address(0)).
    error ZeroNodeRegistry();

    /// @notice Thrown when the payer registry address is being set to zero (i.e. address(0)).
    error ZeroPayerRegistry();

    /// @notice Thrown when the start sequence ID is not the last end sequence ID.
    error InvalidStartSequenceId(uint64 startSequenceId, uint64 lastSequenceId);

    /// @notice Thrown when the start and end sequence IDs are invalid.
    error InvalidSequenceIds();

    /// @notice Thrown when the signing node IDs are not ordered and unique.
    error UnorderedNodeIds();

    /// @notice Thrown when the number of valid signatures is insufficient.
    error InsufficientSignatures(uint8 validSignatureCount, uint8 requiredSignatureCount);

    /// @notice Thrown when the payer report index is out of bounds.
    error PayerReportIndexOutOfBounds();

    /// @notice Thrown when the payer report has already been entirely settled.
    error PayerReportEntirelySettled();

    /// @notice Thrown when the length of the payer fees array is too long.
    error PayerFeesLengthTooLong();

    /// @notice Thrown when failing to settle usage via the payer registry.
    error SettleUsageFailed(bytes returnData_);

    /// @notice Thrown when the lengths of input arrays don't match.
    error ArrayLengthMismatch();

    /// @notice Thrown when the protocol fee rate is invalid.
    error InvalidProtocolFeeRate();

    /// @notice Thrown when there is no change to an updated parameter.
    error NoChange();

    /* ============ Initialization ============ */

    /**
     * @notice Initializes the contract.
     */
    function initialize() external;

    /* ============ Interactive Functions ============ */

    /**
     * @notice Submits a payer report.
     * @param  originatorNodeId_    The originator node ID.
     * @param  startSequenceId_     The start sequence ID.
     * @param  endSequenceId_       The end sequence ID.
     * @param  endMinuteSinceEpoch_ The timestamp of the message at `endSequenceId`.
     * @param  payersMerkleRoot_    The payers Merkle root.
     * @param  nodeIds_             The active node IDs during the reporting period.
     * @param  signatures_          The signature objects for the payer report.
     * @return payerReportIndex_    The index of the payer report in the originator's payer report array.
     */
    function submit(
        uint32 originatorNodeId_,
        uint64 startSequenceId_,
        uint64 endSequenceId_,
        uint32 endMinuteSinceEpoch_,
        bytes32 payersMerkleRoot_,
        uint32[] calldata nodeIds_,
        PayerReportSignature[] calldata signatures_
    ) external returns (uint256 payerReportIndex_);

    /**
     * @notice Settles a subset of a payer report.
     * @param  originatorNodeId_ The originator node ID.
     * @param  payerReportIndex_ The payer report index.
     * @param  payerFees_        The sequential payer fees to settle.
     * @param  proofElements_    The sequential Merkle proof elements for the payer fees to settle.
     */
    function settle(
        uint32 originatorNodeId_,
        uint256 payerReportIndex_,
        bytes[] calldata payerFees_,
        bytes32[] calldata proofElements_
    ) external;

    /**
     * @notice Updates the protocol fee rate.
     */
    function updateProtocolFeeRate() external;

    /* ============ View/Pure Functions ============ */

    /// @notice Returns the EIP712 typehash used in the encoding of a signed digest for a payer report.
    // slither-disable-next-line naming-convention
    function PAYER_REPORT_TYPEHASH() external pure returns (bytes32 payerReportTypehash_);

    /// @notice One hundred percent (in basis points).
    // slither-disable-next-line naming-convention
    function ONE_HUNDRED_PERCENT() external pure returns (uint16 oneHundredPercent_);

    /// @notice The parameter registry key used to fetch the migrator.
    function migratorParameterKey() external pure returns (string memory key_);

    /// @notice The parameter registry key used to fetch the protocol fee rate.
    function protocolFeeRateParameterKey() external pure returns (string memory key_);

    /// @notice The address of the parameter registry.
    function parameterRegistry() external view returns (address parameterRegistry_);

    /// @notice The address of the node registry.
    function nodeRegistry() external view returns (address nodeRegistry_);

    /// @notice The address of the payer registry.
    function payerRegistry() external view returns (address payerRegistry_);

    /// @notice The protocol fee rate (in basis points).
    function protocolFeeRate() external view returns (uint16 protocolFeeRate_);

    /**
     * @notice Returns an array of specific payer reports.
     * @param  originatorNodeIds_  An array of originator node IDs.
     * @param  payerReportIndices_ An array of payer report indices for each of the respective originator node IDs.
     * @return payerReports_       The array of payer reports.
     * @dev    The node IDs in `originatorNodeIds_` don't need to be unique.
     */
    function getPayerReports(
        uint32[] calldata originatorNodeIds_,
        uint256[] calldata payerReportIndices_
    ) external view returns (PayerReport[] memory payerReports_);

    /**
     * @notice Returns a payer report.
     * @param  originatorNodeId_ The originator node ID.
     * @param  payerReportIndex_ The payer report index.
     * @return payerReport_      The payer report.
     */
    function getPayerReport(
        uint32 originatorNodeId_,
        uint256 payerReportIndex_
    ) external view returns (PayerReport memory payerReport_);

    /**
     * @notice Returns the EIP-712 digest for a payer report.
     * @param  originatorNodeId_    The originator node ID.
     * @param  startSequenceId_     The start sequence ID.
     * @param  endSequenceId_       The end sequence ID.
     * @param  endMinuteSinceEpoch_ The timestamp of the message at `endSequenceId`.
     * @param  payersMerkleRoot_    The payers Merkle root.
     * @param  nodeIds_             The active node IDs during the reporting period.
     * @return digest_              The EIP-712 digest.
     */
    function getPayerReportDigest(
        uint32 originatorNodeId_,
        uint64 startSequenceId_,
        uint64 endSequenceId_,
        uint32 endMinuteSinceEpoch_,
        bytes32 payersMerkleRoot_,
        uint32[] calldata nodeIds_
    ) external view returns (bytes32 digest_);
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
