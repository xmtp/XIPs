---
xip: 54
title: XMTP network node operator qualification criteria
description: Criteria and process for selecting XMTP node operators
authors: J-Ha Hasegawa (@jhaaaa), Nicholas Molnar (@neekolas)
discussions-to: https://community.xmtp.org/t/xip-54-xmtp-network-node-operator-qualification-criteria/868
status: Draft
type: Process
created: 2025-02-03
---

## Abstract

This XIP proposes a set of qualification criteria and a selection process for XMTP node operators. Unlike many permissionless networks, XMTP currently requires a limited group of 20 node operators to ensure cost-effective, high-performance messaging while maintaining robust **censorship resistance**. This number may evolve over time. A censorship-resistant network is able to ensure that no single entity can block, alter, or remove data—essentially guaranteeing that the system operates as intended, regardless of external pressures.

This XIP introduces diversity-based requirements—geographic, geopolitical, cultural, and industry—that help mitigate collusion and regulatory pressures that can threaten censorship resistance.

## Motivation

XMTP must uphold censorship resistance while delivering the throughput and latency required for messaging. Traditional blockchains rely on large, open participation, but that model can introduce excessive latency unsuitable for a real-time messaging protocol.

By restricting the network to 20 node operators, XMTP can:

- **Maintain high performance:** Fewer nodes reduces bandwidth usage and network hops to replicate messages, accelerating message delivery speeds.
- **Ensure economic sustainability:** A limited replication factor for messages lowers the breakeven point at which the network becomes economically self-sufficient.
- **Preserve censorship resistance:** As long as a single node operates honestly, the network can resist censorship—even under regulatory or collusive threats.

However, selecting only 20 operators must avoid undue centralization. The criteria in this proposal address that challenge by enforcing diverse geographies and regulatory environments, for example.

## Specification

### 1. Node operator qualification criteria

XMTP node operators must be able to demonstrate:

- **Trust from the web3 community**
  - A history of benevolent operation and a proven track record discouraging malicious behavior.
  - Evidence of contributing to security, privacy, or open-source initiatives in the blockchain or broader tech ecosystem.
- **Alignment with XMTP core values**
  - Explicit commitment to decentralization, security, privacy, open source, permissionlessness, interoperability, and censorship resistance.
  - Willingness to engage constructively with the XMTP community.
- **Technical readiness**
  - Capability to run an XMTP node with reliable uptime.
  - Sufficient network and hardware resources to handle messaging throughput at scale.
- **Diversity contributions**
  - **Geographical diversity:** Operators should be distributed across continents and major Internet Exchange Points (IXPs).
  - **Geopolitical/regulatory diversity:** Operators should operate under different jurisdictions to limit uniform legal or political constraints.
  - **Industry diversity:** Operators should span multiple sectors (web3, web2, non-profits, research, etc.) to bring varied perspectives and reduce collusion risk.
  - **Cultural diversity:** Operators should represent varied cultural backgrounds and languages to enhance global adoption.

### 2. Node operator selection process

A selection committee must adhere to the following guidelines. The committee is currently administered by [Ephemera](https://ephemerahq.com/), the company stewarding the development and adoption of XMTP. In the longer term, the selection process will transition toward using a more decentralized model.

1. **Application and nomination**
    - Invitations may be extended to candidates who meet the core criteria.
    - Community members may nominate qualified candidates.
    - Candidates may apply directly.
2. **Evaluation and scoring**
    - **Objective metrics:** Technical readiness, node performance, and any open-source/security contributions.
    - **Subjective judgments:** Community reputation, values alignment, and potential for cooperation.
    - **Diversity weighing:** The committee must ensure that the operator set reflects diverse geographies, regulatory environments, industries, and cultures.
3. **Operator cap of 20**
    - Only 20 node operator slots will be available during this phase of the network.
    - Any replacement or addition to the operator set must undergo the same evaluation and scoring.
4. **Transparency and review**
    - The selection committee will make accessible a summary of its rationale, redacting any sensitive information.
    - Final decisions may be revisited through community discussions or additional governance proposals (XIPs).

### **3. Ongoing validation of node operator behavior**

Node operators that no longer meet selection criteria or misbehave may face reevaluation and potential replacement. For example, the network monitors for the following node misbehaviors:

- **Liveness**
  - Failing to respond to requests
  - Responding slowly
  - Responding with an error
- **Safety**
  - Omitting payloads
  - Reordering payloads
  - Allowing invalid payloads

To learn more, see [XIP-49: Decentralized backend for MLS messages: Validation rules](https://community.xmtp.org/t/xip-49-decentralized-backend-for-mls-messages/856#p-2045-h-327-validation-rules-43).

## Rationale

### Limited nodes for messaging throughput

XMTP focuses on delivering real-time, low-latency messaging at scale, which becomes impractical with hundreds or thousands of nodes. Restricting the network to 20 nodes balances efficiency and decentralization, ensuring high performance and a workable economic model for operators.

### Diversity for robust censorship resistance

Even with only 20 nodes, diversity helps prevent collusion and ensures that no single legal jurisdiction can impose uniform restrictions on the network. If at least one operator remains honest and uncompromised, the XMTP network retains its ability to withstand censorship or regulatory shutdowns.

### Comparison to permissionless blockchains

Most L1/L2 blockchains rely on fully open access to achieve decentralization, but XMTP’s high-throughput messaging use case demands curation. This approach strikes a balance that ensures censorship resistance remains intact through sufficient operator diversity and a minimal honest presence in the network.

## Backward compatibility

No backward incompatibilities are introduced by this XIP. It proposes criteria and processes for selecting or rotating node operators but doesn't alter existing XMTP protocols or message formats.

## Test cases

This proposal addresses governance and process design rather than a protocol-level feature. Its real-world “test” is the node selection process itself.

## Reference implementation

This XIP doesn't require immediate code changes. Any tooling for tracking or scoring operators could be proposed in a separate XIP.

## Security considerations

- **Collusion risks**
  - Limiting the network to 20 operators introduces a risk that a small subset could collude. The required diversity in geography, geopolitics, industry, and culture reduces that likelihood.
  - Community-driven reports and ongoing network monitoring of [node misbehaviors](#3-ongoing-validation-of-node-operator-behavior) will be actively addressed.
- **Regulatory pressures**
  - Different jurisdictions may impose conflicting demands on node operators. As long as at least one node rejects malicious or overreaching demands, XMTP remains censorship-resistant.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
