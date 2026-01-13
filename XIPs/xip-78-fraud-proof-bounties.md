---
xip: 78
title: Fraud proof bounties
description: Proposes a mechanism to allow independent actors to permissionlessly detect and report cryptographically provable correctness violations in the XMTP Broadcast Network
author: Martin Kysel (@mkysel)
discussions-to: https://improve.xmtp.org/t/xip-78-fraud-proof-bounties/2058
status: Draft
type: Standards
category: Core
created: 2026-01-12
---

## Abstract

This XIP defines **fraud proof bounties**, a mechanism that will allow independent actors to **permissionlessly detect and report cryptographically provable correctness violations** in the XMTP broadcast network.

The initial scope of this XIP targets a single high-severity correctness failure:

> A node signs two different `OriginatorEnvelopes` for the same `(originator_node_id, originator_sequence_id)`.

This violation is provable by presenting the two conflicting signed envelopes. The reporter may receive a reward, potentially funded by protocol inflation, fees, or a portion of penalties (e.g., slashing) applied to the misbehaving node.

To avoid punishing operators for bugs during early rollout, fraud proofs are expected to be reviewed by a **Security Council** or similar governance process before enforcement. Over time, enforcement may be automated.

This XIP depends on the terminology and envelope format defined in [XIP-49: Decentralized backend for MLS messages](https://github.com/xmtp/XIPs/blob/main/XIPs/xip-49-decentralized-backend.md), particularly:

- **Originator node behavior** (XIP-49 §3.2.1)
- **Originator envelopes and signatures** (XIP-49 §3.2.1)
- **Sequence IDs and cursors** (XIP-49 §3.2.2)

## Motivation

XMTP’s decentralization goals include censorship resistance and accountability. Many failures on the public internet (timeouts, IP blocking, refusal to accept connections) cannot be proven cryptographically and are often indistinguishable from normal operational behavior.

However, a subset of failures *can* be proven when nodes produce signed artifacts, such as `OriginatorEnvelope`s.

Fraud proof bounties are designed to provide:

- **Deterrence:** Discourage provable misbehavior by making detection economically incentivized.
- **Permissionless monitoring:** Enable many independent actors to participate without needing special access.
- **Cryptographic accountability:** Rely on objective evidence rather than subjective claims.
- **Early bug discovery:** Catch implementation faults that cause equivocation before they cause widespread harm.

This XIP intentionally focuses on a correctness violation meets each of these criteria:

- Severe
- Unambiguous
- Independently verifiable from public artifacts

## Definitions

This XIP uses terms as defined in XIP-49. The key objects are:

### OriginatorEnvelope (XIP-49 §3.2.1)

A payload enters the network through an **originator node**, which wraps a `PayerEnvelope` and assigns:

- `originator_node_id`
- `originator_sequence_id`
- `originator_ns`

The originator node then signs the resulting `UnsignedOriginatorEnvelope`, producing an `OriginatorEnvelope`.

> OriginatorEnvelope
>
>
> `OriginatorEnvelope { unsigned_originator_envelope, originator_signature }`
>

This XIP assumes that originator signatures are **recoverable**, as described in XIP-49.

### Equivocation (duplicate sequence ID)

For the purposes of this XIP, **equivocation** occurs when a node produces two distinct signed `OriginatorEnvelope`s for the same:

- `originator_node_id`, and
- `originator_sequence_id`

but with different underlying payload commitments (i.e., different `unsigned_originator_envelope` bytes).

This corresponds to XIP-49’s description of "sequence IDs being strictly increasing per node" and being signed for non-repudiation (XIP-49 §3.2.2).

### Fraud proof

A **fraud proof** is a bundle of signed artifacts that provides cryptographic evidence of equivocation (as defined above) and can be validated by any independent verifier.

## Specification

### 1. Fraud proof type: Duplicate originator sequence ID (equivocation)

A fraud proof MUST demonstrate that:

- A single node `N` signed two `OriginatorEnvelope`s `E1` and `E2`, such that:
  - `E1.originator_node_id == E2.originator_node_id == N`
  - `E1.originator_sequence_id == E2.originator_sequence_id == S`
  - and the envelopes are **not identical**, i.e.,:
    - `E1.unsigned_originator_envelope != E2.unsigned_originator_envelope`

#### Rationale for #1

Because the node signature commits to the full `UnsignedOriginatorEnvelope`, signing two different envelopes for the same `(originator_node_id, originator_sequence_id)` constitutes a cryptographic contradiction.

This is a strict correctness violation.

### 2. Fraud proof contents (minimum requirements)

A valid fraud proof MUST include:

1. **Envelope A** (`OriginatorEnvelope E1`)
2. **Envelope B** (`OriginatorEnvelope E2`)
3. A verifier MUST be able to extract from each envelope:
    - `originator_node_id`
    - `originator_sequence_id`
    - `originator_signature` (or equivalent proof field)
    - `unsigned_originator_envelope` bytes

A fraud proof MAY include additional context (timestamps, retrieval method, etc.), but such context MUST NOT be required for validity.

### 3. Verification procedure

A verifier MUST:

1. Parse `E1` and `E2` as `OriginatorEnvelope`.
2. Recover the signer from `originator_signature` for each envelope.
3. Confirm both signatures recover to the same originator public key and correspond to the same `originator_node_id` via the node registry referenced in XIP-49 (see XIP-49 §3.1.1 / §3.2.5).
4. Confirm:
   - `E1.originator_node_id == E2.originator_node_id`
   - `E1.originator_sequence_id == E2.originator_sequence_id`
5. Confirm:
   - `E1.unsigned_originator_envelope != E2.unsigned_originator_envelope`

If all checks succeed, the fraud proof MUST be treated as valid.

## Participation

Any actor MAY participate in fraud proof bounties.

Actors do not need privileged roles. They only require access to signed `OriginatorEnvelope`s, which are already present in XIP-49's client and node APIs:

- `PublishPayerEnvelopes` returns `OriginatorEnvelope`s (XIP-49 §3.3.3)
- Nodes and clients can query envelopes via `QueryEnvelopes` / `SubscribeEnvelopes` (XIP-49 §3.2.3 and §3.3.3)

### Suggested discovery strategies

#### A. Publish and observe

An actor MAY:

1. Publish a message via `PublishPayerEnvelopes` to obtain an `OriginatorEnvelope`.
2. Monitor other nodes using `QueryEnvelopes` / `SubscribeEnvelopes` to observe replication outcomes.
3. Query the originator node or other nodes for the same `(originator_node_id, originator_sequence_id)` and compare results.
4. If two different signed envelopes exist for the same seqID, submit a fraud proof.

This approach works even if the actor is not running a node, as long as it can query nodes.

### B. Passive monitoring

An actor MAY monitor envelope streams or archives and automatically scan for seqID conflicts by keeping a map of:

`(originator_node_id, originator_sequence_id) → hash(unsigned_originator_envelope)`

Any time a different hash is observed for the same key, the actor can generate a fraud proof.

## Bounty rewards

### Reward objective

Rewards will incentivize independent actors to continuously monitor the network for provable faults.

### Reward source (non-normative)

Rewards MAY be funded by:

- Protocol-funded bounty pool
- A portion of penalties applied to the misbehaving node (including slashing, if implemented)
- Third-party programs

This XIP does not prescribe the exact funding mechanism.

### Duplicate submissions

To prevent multiple payouts for the same incident, implementations SHOULD:

- Compute a deterministic proof ID (e.g., nodeID + seqID)
- Pay the first valid submission
- Accept later submissions without paying rewards

## Adjudication and enforcement

### Early phase: Security Council review (recommended)

To avoid punishing operators for implementation bugs early in the network’s lifecycle, fraud proofs SHOULD initially be subject to Security Council review before penalties are applied.

The Security Council’s role will be to:

- Verify the cryptographic proof
- Coordinate remediation
- Apply conservative penalties during early rollout

### Later phase: Automated enforcement (possible)

Once implementations mature and correctness invariants stabilize, enforcement MAY transition to automated mechanisms for strict equivocation proofs.

Enforcement examples include:

- Disqualification from payouts
- Removal from active node sets
- Slashing (if stake-based security exists)

The automation path is intentionally left to governance.

## Rationale

### Why focus on seqID equivocation?

SeqID equivocation is:

- Provable with two signed artifacts
- Catastrophic for trust in the originator log
- Difficult to justify as “normal operations”

It is also already contemplated by XIP-49’s use of signed, strictly increasing sequence IDs for non-repudiation (XIP-49 §3.2.2).

### Why permissionless participation?

Permissionless monitoring increases:

- Detection coverage
- Decentralization of oversight
- Long-term system integrity

Fraud proof bounties turn “watching” into an economically supported role.

## Backward compatibility

This XIP does not change message formats or protocol behavior defined in XIP-49. It introduces a new incentive/enforcement process layered on top of existing signed artifacts.

## Security considerations

### Threat model

#### False reporting

False reports are limited because a fraud proof is self-verifying. Invalid proofs can be rejected deterministically.

#### Spam / DoS

Implementations SHOULD consider the following for submission endpoints:

- Rate limits
- Submission fees (refundable on valid proofs)
- Proof-of-work gating
