---
xip: 79
title: Alternative node selection strategies
description: Configurable node selection strategies for XMTP Gateway routing: stable, manual, ordered, random, and closest.
author(s): Isaac Hartford (api-Hypernova), Martin Kysel (mkysel)
discussions-to: 
status: Draft
type: Standards
category: Network
created: 2025-01-09
---

## Abstract

This XIP proposes a configurable node selection strategy system for XMTP Gateway nodes. Currently, the Gateway only supports stable hashing for deterministic pseudo-random topic-to-node mapping. This XIP introduces four additional selection strategies—Manual, Ordered, Random, and Closest—enabling operators to optimize node selection for testing, staged deployments, or latency-sensitive production environments.

## Motivation

The existing stable hashing selector provides consistent topic affinity, ensuring messages for the same topic route to the same originator node. While this works well for production load distribution, it lacked flexibility for critical use cases:

1. **Testing and development**: Engineers need deterministic control over which node handles traffic (e.g., "route all messages to Node 100 only")
2. **Staged rollouts**: Operators may want to prioritize specific nodes while maintaining automatic fallback
3. **Latency optimization**: Production deployments benefit from selecting the geographically closest node
4. **Load balancing experiments**: Pure random distribution provides an alternative for evaluating load patterns

Without alternative strategies, operators have no mechanism to direct traffic for debugging, staged deployments, or latency-sensitive optimizations.

## Specification

The keywords "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.

### 1.0: Node selector interface

All selection strategies implement the `NodeSelectorAlgorithm` interface:

```go
type NodeSelectorAlgorithm interface {
    GetNode(topic topic.Topic, banlist ...[]uint32) (uint32, error)
}
```

The interface accepts a topic and an optional list of unavailable node IDs to exclude. Implementations return a valid node ID or an error if no suitable node exists.

### 2.0: Supported strategies

#### 2.1: Stable (default)

**Strategy key:** `stable`

Implements deterministic topic-to-node selection using SHA-256 hashing. Nodes are sorted by NodeID to ensure consistent ordering across restarts.

This strategy aligns with the originator selection algorithm defined in [XIP-49](https://improve.xmtp.org/t/xip-49-decentralized-backend-for-mls-messages/856#p-2045-h-336-originator-selection-algorithm-57). Topic stickiness is valuable because routing messages for the same topic to the same originator node leads to total ordering of messages for that topic, reducing ordering anomalies.

**Algorithm:**

1. Hash the topic using SHA-256, extract first 4 bytes as uint32
2. Sort available nodes by NodeID ascending
3. Compute virtual positions evenly distributed across uint32 address space
4. Binary search to find the node responsible for the topic's hash position
5. If that node is unavailable, iterate to the next node in sorted order

This strategy provides topic affinity (stickiness) and minimizes churn when the node set is stable. Node set changes cause remapping for some topics.

#### 2.2: Manual

**Strategy key:** `manual`

Selects the first available node from an explicitly configured list of node IDs. The topic is ignored.

**Requirements:**

`node-selector-preferred-nodes` MUST contain at least one node ID

**Behavior:**

- Iterates through configured node IDs in order
- Skips nodes not present in registry
- Skips unavailable nodes
- Returns error if no configured node is usable

This strategy is useful for pinning traffic to specific nodes during testing or partial rollouts.

#### 2.3: Ordered

**Strategy key:** `ordered`

Selects the first available node from a preferred ordered list, falling back to any available node in the registry if none of the preferred nodes are usable.

**Requirements:**

`node-selector-preferred-nodes` MUST contain at least one node ID

**Behavior:**

- First iterates through preferred nodes in configured order
- If no preferred node is available, falls back to any registry node
- Skips unavailable nodes

This strategy provides prioritization with automatic fallback for resilience.

#### 2.4: Random

**Strategy Key:** `random`

Selects a node uniformly at random from all currently available nodes, excluding unavailable nodes. The implementation uses cryptographically secure random number generation (`crypto/rand`).

**Behavior:**

- Filters out unavailable nodes from available nodes
- Selects uniformly at random from remaining nodes
- Returns error if no nodes available after filtering

This strategy provides statistical load distribution but no topic affinity or determinism.

#### 2.5: Closest

**Strategy key:** `closest`

Selects the node with the lowest measured TCP connect latency, with optional restriction to a preferred node set.

**Implementation details:**

- Measures latency via TCP handshake to each node's HTTP address
- Caches latency results with configurable expiry (default: 5 minutes)
- Respects configurable connection timeout (default: 2 seconds)
- If `node-selector-preferred-nodes` is set, restricts measurements to those nodes
- Falls back to all registry nodes if no preferred nodes are available

**Behavior:**

- On cache expiry, re-measures latency to all candidate nodes
- Selects node with minimum measured latency
- Skips unavailable nodes
- Returns error if no latency measurements are available

### 3.0: Configuration

The following configuration options control node selection:

| Option | Environment Variable | Description | Default |
| --- | --- | --- | --- |
| `--payer.node-selector-strategy` | `XMTPD_PAYER_NODE_SELECTOR_STRATEGY` | Selection strategy: stable, manual, ordered, random, closest | stable |
| `--payer.node-selector-preferred-nodes` | `XMTPD_PAYER_NODE_SELECTOR_PREFERRED_NODES` | Comma-separated list of preferred node IDs | (empty) |
| `--payer.node-selector-cache-expiry` | `XMTPD_PAYER_NODE_SELECTOR_CACHE_EXPIRY` | Cache TTL for closest strategy latency measurements | 5m |
| `--payer.node-selector-connect-timeout` | `XMTPD_PAYER_NODE_SELECTOR_CONNECT_TIMEOUT` | TCP probe timeout for closest strategy | 2s |

The `Uint32Slice` type handles parsing of the preferred nodes list, accepting comma-separated values and gracefully handling empty strings.

### 4.0: Unavailable nodes and retry behavior

All strategies support an unavailable node tracking mechanism for fault tolerance:

1. When publishing to a node fails, the failed node ID is added to a request-scoped unavailable list
2. The selector is called again with the updated unavailable list to get an alternative node
3. This continues for up to 5 retry attempts
4. Each strategy filters unavailable nodes from consideration

### 5.0: Validation rules

Configuration validation enforces:

- `node-selector-strategy` must be one of: `stable`, `manual`, `ordered`, `random`, `closest`
- Strategies `manual` and `ordered` require at least one node in `node-selector-preferred-nodes`
- `node-selector-cache-expiry` must be greater than 0
- `node-selector-connect-timeout` must be greater than 0

## Rationale

### Design decisions

**Five strategies vs fewer:** Each strategy addresses distinct operational needs. Consolidating would reduce flexibility for specific use cases like controlled testing (manual) vs. production latency optimization (closest).

**Interface design:** The `NodeSelectorAlgorithm` interface accepts a topic even when unused (e.g., by Manual, Random, Closest) to maintain a consistent API. This allows transparent strategy swapping without code changes.

**Unavailable list as variadic argument:** The unavailable list is passed as `...\[\]uint32` to keep the common case (no unavailable nodes) simple while supporting retry logic without interface changes.

**Closest strategy caching:** Measuring TCP latency on every request would introduce unacceptable overhead. Caching with configurable expiry balances accuracy with performance.

**Uint32Slice custom type:** A dedicated type was implemented to handle comma-separated node ID parsing, gracefully accepting empty strings from environment variables without parse errors.

### Alternate designs considered

**Consistent hashing with virtual nodes:** Considered for the stable strategy but rejected in favor of simple position-based hashing to minimize complexity. The current implementation provides sufficient distribution for expected node counts.

**HTTP-based latency measurement:** Considered for closest strategy but TCP handshake was chosen as it provides accurate network latency without requiring application-layer overhead.

## Backward compatibility

This change is fully backward compatible:

- The default strategy remains `stable`, matching prior behavior exactly
- No changes to wire protocols or message formats
- Configuration is opt-in via new flags/environment variables
- Existing deployments continue to function without modification
- The original stable hashing algorithm is unchanged

## Test cases

Test cases should verify:

- Each strategy returns a valid node ID from the registry
- Strategies correctly exclude unavailable nodes
- Stable strategy maintains topic affinity across repeated calls
- Manual and Ordered strategies respect configured node ordering
- Random strategy provides statistical distribution
- Closest strategy selects minimum latency node
- All strategies return an error when no nodes are available

## Reference implementation

Reference implementation: [PR #1483 - Gateway Alternative Node Selection Strategies](https://github.com/xmtp/xmtpd/pull/1483)

## Security considerations

1. **Closest strategy TCP probing**: The closest strategy performs TCP probes to measure latency. These probes only complete the TCP handshake and do not send application data. However, probe traffic patterns could theoretically be used for node enumeration by adversaries monitoring network traffic. Operators SHOULD consider this when deploying in adversarial environments.
2. **Manual strategy misconfiguration**: Specifying non-existent node IDs in the manual strategy causes message delivery failures. The validation layer ensures at least one node is configured, but does not validate that configured nodes exist in the registry at startup time. Operators MUST ensure configured node IDs correspond to active registry nodes.
3. **Random strategy entropy**: The random strategy uses `crypto/rand` for secure random selection, ensuring unpredictable node selection patterns. This prevents adversaries from predicting routing to target specific nodes.
4. **Unavailable list exhaustion**: If all nodes fail and are added to the unavailable list, message delivery fails. This is expected behavior—the unavailable list prevents retry loops to consistently failing nodes.
5. **Configuration injection**: If an attacker gains access to configuration, they could redirect traffic via manual strategy. Configuration MUST be protected via standard infrastructure security practices.

### Threat model

**Malicious node targeting**: An attacker who knows the stable hashing algorithm could craft topics designed to target specific nodes. Mitigation: The stable strategy uses SHA-256 hashing, making targeted topic crafting computationally expensive.

**Latency manipulation**: An attacker controlling network infrastructure could manipulate TCP latency measurements to influence closest strategy selection. Mitigation: The closest strategy is optional and operators should only use it in trusted network environments.

**Node ID enumeration**: Repeated calls to the selector could reveal the node set. Mitigation: Node registry information is already public; this does not expose new information.

**Configuration injection**: If an attacker gains access to configuration, they could redirect traffic via manual strategy. Mitigation: Configuration must be protected via standard infrastructure security practices.

## Copyright

Copyright and related rights waived via CC0.
