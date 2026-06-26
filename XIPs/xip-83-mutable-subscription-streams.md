---
xip: 83
title: Mutable subscription streams with liveness
description: A bidirectional subscription stream clients mutate in place without reconnecting, with liveness heartbeats to surface silent stream death.
author: Tyler Hawkes (@tylerhawkes)
discussions-to: https://community.xmtp.org/t/xip-83-mutable-subscription-streams-with-liveness/
status: Draft
type: Standards
category: Network
created: 2026-06-01
---

## Abstract

XMTP's message subscriptions today are unary-request, server-streaming RPCs
(`SubscribeGroupMessages`, `SubscribeWelcomeMessages`) over a **fixed** subscription set, with **no
application-level liveness signal**. This forces two costly patterns: a client must **tear down and
reopen** its stream every time its subscription set changes (e.g. joining a group), and it cannot
distinguish a healthy-but-idle stream from one that an intermediary has silently dropped.

This XIP defines a single **bidirectional** subscription RPC. The client opens one long-lived stream
and **mutates its subscription in place** by sending add/remove deltas up the request channel; the
server delivers messages down the response channel. Both sides keep the stream honest with a
**WebSocket-style liveness ping**: a nonce-matched ping/pong in which the receiver MUST answer and
the initiator closes the stream if it does not. This eliminates reconnect churn on membership
changes, lets a client detect silent stream death (a subscription an intermediary holds open after
the origin stops serving it), lets a node promptly **reap** a peer that has gone away (e.g. a mobile
client the OS suspended behind a proxy that still ACKs the transport), and lets a single connection
carry the union of many groups and welcomes — the enabling primitive for multi-tenant agent gateways.

## Motivation

The current MLS subscription RPCs (`xmtp.mls.api.v1.MlsApi/SubscribeGroupMessages` and
`SubscribeWelcomeMessages`) are server-streaming over a topic set fixed at stream-open. Two
deficiencies follow directly:

### 1. Silent stream death

A subscription that goes idle (no traffic for an extended period) can have its underlying transport
held open by an intermediary — an L7 load balancer or proxy that keeps answering HTTP/2 keepalive
pings at the edge while the backend subscription is gone. The client observes neither an error nor a
stream close; its consumer simply never receives the next message. Messages are silently dropped
until the process restarts. Transport-layer keepalives are insufficient here precisely because a
terminating proxy answers them without the origin's participation; only an **application-level
payload from the origin** proves the subscription is still being served end-to-end.

### 2. Subscription churn on membership change

Because the topic set is fixed at open, a client that is added to a new group must close its stream
and open a new one covering the expanded set. For clients whose membership changes frequently, this
is an O(membership-changes) sequence of reconnects — each a fresh stream that must re-run catch-up
and is itself a new opportunity for silent death.

### Motivating deployment (non-normative): multi-tenant agent gateways

The driving use case is a service that hosts many XMTP identities (e.g. AI agents) and relays their
traffic. Without mutate-in-place and a liveness signal, such a service is forced into one stream per
identity per topic group (N×M open streams) plus bespoke silent-death band-aids. With this XIP a
gateway holds **one** long-lived stream per connection carrying the **union** of its hosted
identities' subscriptions, adds/removes them as identities join/leave groups, and relies on the
heartbeat to detect and recover dead connections. The gateway's internal architecture (storage,
sharding, process model) is out of scope for this XIP; only the node↔client subscription protocol is
standardized here.

```mermaid
flowchart LR
    subgraph proc["gateway process (one of N)"]
        c1["Client A (installation A)"]
        c2["Client B (installation B)"]
        c3["Client … (installation …)"]
        mux["subscription multiplexer<br/>union subscriptions · shard · demux by id · dedup shared groups"]
        c1 --> mux
        c2 --> mux
        c3 --> mux
    end
    mux -->|"Subscribe stream 1 (shard 1)"| node["XMTP node"]
    mux -->|"Subscribe stream 2 (shard 2)"| node
    mux -->|"Subscribe stream k"| node
    node -->|"Messages + Ping"| mux
```

*A process hosting many identities holds a handful of canonical bidirectional `Subscribe` connections
— not one per identity per group. The multiplexer unions every client's subscriptions, shards them
across `k` streams, routes inbound messages back to the owning client by `group_id` /
`installation_key`, and subscribes a shared group only once even when several local clients want it.
Because the node applies authorization per subscription (not per connection identity) and payloads
are end-to-end encrypted, one connection legitimately carries many installations' subscriptions.*

## Specification

The keywords "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT",
"RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in
[RFC 2119](https://www.ietf.org/rfc/rfc2119.txt).

XIP-83 specifies a **control protocol** with two backend bindings. The proto and requirements below
are written against the v3 `MlsApi` (`xmtp.mls.api.v1.Subscribe`); the decentralized backend carries
the identical control protocol on `xmtp.xmtpv4.message_api.QueryApi.Subscribe`, differing only in its
data model (per-originator vector cursors, envelope delivery). See [Decentralized (d14n)
binding](#decentralized-d14n-binding); all other requirements apply to both bindings unchanged.

### Overview

```mermaid
sequenceDiagram
    participant C as client
    participant N as node

    C->>N: open bidi stream Subscribe()
    C->>N: SubscribeRequest.Mutate (adds g1, g2 @cursors, mutate_id=1)
    N-->>C: Started
    Note right of N: immediate, keeps proxied connections open
    N-->>C: Messages (catch-up)
    N-->>C: TopicsLive (g1, g2)
    Note right of N: these topics are now live tail
    N-->>C: CatchupComplete (mutate_id=1)
    C->>N: SubscribeRequest.Mutate (adds g3, mutate_id=2)
    Note over C: joined a new group, no reconnect
    N-->>C: Messages (g3 catch-up)
    N-->>C: TopicsLive (g3)
    N-->>C: CatchupComplete (mutate_id=2)
    Note right of N: one per Mutate that adds, after its wave's last TopicsLive
    N-->>C: Messages (g3 live)
    N-->>C: Ping (nonce=k)
    Note right of N: idle liveness challenge, every 30s or less
    C->>N: Pong (nonce=k)
    Note right of N: no Pong within the deadline → node closes & reaps
    C->>N: SubscribeRequest.Mutate (removes g1)
    C->>N: Ping (nonce=j)
    Note over C: e.g. just resumed from background — probe the link
    N-->>C: Pong (nonce=j)
```

#### Stream lifecycle (client view)

```mermaid
stateDiagram-v2
    [*] --> Opening: open Subscribe()
    Opening --> CatchingUp: Started + Mutate(add)
    CatchingUp --> Live: CatchupComplete
    Live --> Live: Messages / Mutate(add, remove)
    Live --> Live: Ping and Pong (either direction)
    Live --> Stale: no frame for N x interval
    Live --> Suspended: process backgrounded
    Suspended --> Resuming: process foregrounded
    Resuming --> Live: resume-probe Ping answered (socket survived, rare)
    Resuming --> Stale: resume-probe Ping unanswered or write fails
    Stale --> Reconnecting: close (on_close triggers reconnect)
    Reconnecting --> Opening: resume from durable cursors
```

*Client view of one stream. Steady state is `Live`, with `Ping`/`Pong` keeping both ends honest.
Silence past the watchdog threshold — or an unanswered resume-probe after the OS un-suspends the
process — drops to `Stale` and reconnects from durable cursors. The node independently reaps a stream
whose `Pong`s stop arriving (server requirement 4).*

### Protocol

Nodes MUST expose a bidirectional streaming RPC on the MLS API service. Each frame, in either
direction, is exactly one of: a subscription mutation, a liveness `Ping`, or a `Pong` answering a
peer's `Ping`.

```protobuf
service MlsApi {
  // ... existing RPCs unchanged ...
  rpc Subscribe(stream SubscribeRequest) returns (stream SubscribeResponse) {}
}

// client → server, sent one or more times over the life of the stream.
message SubscribeRequest {
  oneof version { V1 v1 = 1; } // versioned like GroupMessage/WelcomeMessage

  message V1 {
    oneof request {
      Mutate mutate = 1;
      Ping   ping   = 2; // liveness challenge (e.g. probe the link after resuming)
      Pong   pong   = 3; // answer to a server Ping
    }

    // Add and/or remove subscriptions in place (atomic per frame). Topics use the
    // kind-prefixed binary representation shared with the decentralized backend
    // (XIP-49 §3.3.2): first byte = topic kind, remainder = identifier. This RPC
    // initially serves kind 0x00 (group messages; identifier = group_id) and kind
    // 0x01 (welcomes; identifier = installation_key); an unsupported kind fails the
    // stream with INVALID_ARGUMENT. Future kinds arrive via Started.capabilities.
    message Mutate {
      repeated Subscription adds      = 1; // begin delivering these topics
      repeated bytes        removes   = 2; // stop delivering; clears the floor so a re-add replays
      bool             history_only   = 3; // catch the adds up, but do not deliver live (see req 9)
      uint64           mutate_id      = 4; // echoed on this wave's CatchupComplete; 0 = none

      message Subscription { bytes topic = 1; uint64 id_cursor = 2; } // cursor 0 = from the beginning
    }
  }
}

// server → client
message SubscribeResponse {
  oneof version { V1 v1 = 1; }

  message V1 {
    oneof response {
      Messages        messages         = 1;
      Started         started          = 2; // sent once, immediately on open
      Ping            ping             = 3; // idle liveness challenge; receiver MUST answer with Pong
      Pong            pong             = 4; // answer to a client Ping
      TopicsLive      topics_live      = 5; // these topics just crossed from catch-up to live
      CatchupComplete catchup_complete = 6; // a Mutate's adds are fully delivered; echoes mutate_id
    }

    message Messages {
      repeated GroupMessage   group_messages   = 1;
      repeated WelcomeMessage welcome_messages = 2;
    }

    // Emitted when topics finish catch-up, AFTER their last history frame — including any
    // live messages that queued up behind the catch-up, which were equally historical from
    // the client's perspective — so every later frame for a listed topic is live tail.
    message TopicsLive {
      repeated bytes topics = 1; // kind-prefixed topics now tailing live
    }

    message Started {
      uint32 keepalive_interval_ms = 1; // ping cadence + reap-deadline basis
      repeated Capability capabilities = 2; // optional features this node speaks
    }

    // Sent once per Mutate that adds subscriptions, after the wave's last TopicsLive.
    message CatchupComplete {
      uint64 mutate_id = 1; // echoes the Mutate that started this wave (0 if none given)
    }

    // Optional per-stream protocol features (none defined yet; future revisions add
    // values, e.g. fetch-over-stream lookups answered from the stream's own read view,
    // or new streamable topic kinds).
    enum Capability {
      CAPABILITY_UNSPECIFIED = 0;
    }
  }
}

// Liveness challenge/response, shared across versions. Either peer MAY send a Ping; the receiver
// MUST reply with a Pong echoing the nonce. The sender of a Ping closes the stream if no Pong
// arrives within its deadline.
message Ping { uint64 nonce = 1; }
message Pong { uint64 nonce = 1; } // echoes the nonce of the Ping it answers
```

Subscriptions are expressed as **kind-prefixed binary topics** — the representation the
decentralized backend already uses (XIP-49 §3.3.2) and that clients already build for their cursor
stores: one kind byte plus the raw identifier, with no string formatting. The node validates the
kind and stays the authority over which kinds this RPC serves; the same shape extends to future
streamable objects (key packages, identity updates) without protocol changes. A single stream MAY
carry both group and welcome subscriptions, and subscriptions belonging to many identities. `SubscribeRequest` and `SubscribeResponse` wrap their payload in `oneof version` so a
future revision can restructure them while old peers keep speaking `V1`; `Ping`/`Pong` are
version-independent. The version is **pinned per stream**: a stream whose requests are `V1` receives
only `V1` responses, so a client never has to handle a response version it did not speak first (see
server requirement 8).

### Server requirements

1. The node MUST send a `Started` frame immediately upon accepting the stream, before any catch-up,
   so that proxied/buffered transports keep the connection open. It MUST advertise its ping cadence
   in `keepalive_interval_ms` whenever it sends `Ping`s, so clients derive an accurate watchdog
   threshold, and MUST list the optional protocol features it supports in `capabilities`. Because a node silently ignores request types it does not
   understand, a client MUST NOT send an optional request type whose capability the node did not
   advertise — it would hang waiting on a response that will never come. (No capabilities are defined
   by this revision; the field is the feature-detection hook for future ones.)
2. For each `Subscription` in `adds`, the node MUST validate the kind-prefixed topic (failing the
   stream with `INVALID_ARGUMENT` for a kind this RPC does not serve), deliver messages with id
   greater than `id_cursor` (`0` meaning from the beginning, matching the existing server-streaming
   RPCs), performing catch-up from history then transitioning to live delivery, and MUST NOT deliver
   an id at or below a cursor it has already advanced past for that subscription **while continuously
   subscribed** on this stream (no duplicates across catch-up/live; removing and re-adding a topic
   resets this floor — see requirement 3).
3. The node MUST process `Mutate` deltas that arrive **after** the initial request, mutating the live
   subscription **without** terminating or reopening the stream. Within a single `Mutate`, `removes`
   are applied before `adds`, so a topic present in both is reset — removed, then re-added with a
   fresh catch-up — and duplicate topics within `adds` are coalesced, the lowest `id_cursor` winning.
   Topics named in `removes` MUST stop being delivered promptly; messages already serialized to the
   response channel before the node processed the removal MAY still arrive, and the client discards
   them. Removing a topic clears its per-stream cursor floor (requirement 2), so a later `add` — even
   one carrying a lower `id_cursor` — starts a fresh catch-up and replays that history; re-adding a
   topic that is still actively subscribed is a no-op unless its `id_cursor` is below the current
   floor, which restarts that topic's catch-up from the lower cursor. Additions otherwise follow
   rule (2).
4. **Liveness (ping/pong).** Whenever no frame has been sent down the response channel for a bounded
   idle interval (server-controlled, RECOMMENDED **≤ 30 seconds**), the node MUST send a `Ping` with a
   fresh nonce. The idle timer MUST reset whenever any frame is delivered, so the heartbeat adds **no
   per-message overhead** and imposes **no per-topic broadcast** — it is a property of the connection,
   not of any conversation. The node MUST close the stream if the client does not return the matching
   `Pong` echoing the ping's nonce within a bounded deadline (RECOMMENDED ≤ the ping interval); other
   client frames do **not** satisfy the deadline, so a client whose receive path has died — it never
   sees the `Ping` — is reaped even while it keeps sending. This reaps a client that has gone away,
   including one suspended by a mobile OS behind a proxy that still ACKs the transport. The node MUST
   also answer any client `Ping` with a `Pong` echoing its nonce.
5. The node MUST apply the same authorization to subscriptions added mid-stream as it would to those
   in the opening request. Mutating a subscription MUST NOT be a privilege-escalation path. Any
   authorization the node enforces MUST be evaluated **per subscription**, independent of the
   connection: a single `Subscribe` connection MAY carry subscriptions belonging to **multiple
   identities or installations**, and the node MUST NOT require that all subscriptions on one
   connection share a single identity. This is what lets one process multiplex many local clients onto
   a handful of upstream connections (the gateway use case in *Motivation*) without an intermediary.
   Because each topic is itself the resource identifier — the kind-prefixed `group_id` /
   `installation_key` — per-subscription authorization keys on the topic; no separate identity field
   on `Subscription` is needed. (v3's read path is topic-keyed and enforces no per-identity read
   authorization; this requirement binds any node that does.)
6. The node SHOULD bound per-stream resources: a maximum number of subscriptions per stream, a maximum
   mutation rate, and a maximum client-`Ping` rate. Requests exceeding these limits SHOULD be rejected
   with a gRPC error rather than silently truncated. Because the server-initiated heartbeat cadence is
   server-controlled, a client cannot force an expensive ping rate.
7. **Live-boundary signals.** When subscriptions finish catch-up, the node MUST emit a `TopicsLive`
   frame listing their topics, **after** the last history frame for those topics — including any
   live messages that queued up behind the catch-up, which were equally historical from the client's
   perspective — so that every later frame for a listed topic is live tail. In addition, each
   `Mutate` that adds subscriptions starts a catch-up **wave**, and once all of a wave's
   subscriptions have crossed to live the node MUST emit `CatchupComplete` echoing the Mutate's
   `mutate_id`, after the wave's last `TopicsLive`. A `Mutate` that adds nothing yields no wave and
   no `CatchupComplete` — except a stream's **first** `Mutate`, which always yields one, so a client
   that subscribed nothing still learns it is live. Waves from overlapping `Mutate`s MAY complete in
   any order; the echoed `mutate_id` keeps completions attributable, and `TopicsLive` provides
   per-topic attribution. These signals are what let a client distinguish backfill from live (e.g. suppress
   notifications for history) and let a multiplexing client signal per-consumer readiness. Both are
   **informational only**: delivery correctness (no duplicates, no gaps — rule 2) never depends on
   them, a client MUST NOT rely on them for duplicate suppression, and re-adding a subscription
   re-runs catch-up and re-emits them, so receivers treat them idempotently.
8. **Version pinning.** The node MUST respond on the same `version` arm the client's requests use: a
   stream whose requests are `V1` receives only `V1` responses. A future revision is adopted only by
   a client electing to speak it, never imposed mid-stream by the node. A node that receives a
   `SubscribeRequest` whose `version` arm it does not recognize MUST fail the stream with
   `INVALID_ARGUMENT` rather than silently ignore it, so a forward-version client is never wedged
   waiting on a response that will never come. The sole exception to pinning is the initial `Started`,
   which the node sends in the base version before it has read any request; a client targeting a
   future version MUST accept a base-version `Started`.
9. **Bounded catch-up and graceful shutdown.** A `Mutate` with `history_only = true` catches its adds
   up exactly as rule 2 — history, `TopicsLive` markers (which then mean "you have everything as of
   now"), and the wave's `CatchupComplete` — but the node MUST NOT register those topics for live
   delivery (removals in the same `Mutate` apply normally). When the client **half-closes** its
   request stream, the node MUST stop sending `Ping`s (a half-closed peer cannot answer; the client
   suspends its watchdog for the bounded drain and relies on gRPC transport timeouts — see client
   requirement 4), MUST finish all in-flight catch-up waves, and MUST then close the stream with `OK`;
   if no waves are in flight, it closes immediately. Together these give the
   bounded catch-up ("sync") flow with no extra protocol: open → `Mutate{ history_only }` →
   half-close → read until the server hangs up. A client that needs to stop **immediately** cancels
   the RPC instead — no dedicated stop frame exists because HTTP/2 cancellation already propagates
   in one round trip and fails the node's pending sends.

### Client requirements

1. A client MUST answer a server `Ping` with a `Pong` echoing its nonce, promptly (well within the
   advertised interval). Failing to do so will cause the node to close the stream.
2. A client SHOULD maintain a watchdog: if no frame of any kind (message, status, or `Ping`) is
   received within **N times** the heartbeat interval, it SHOULD treat the stream as dead, close it,
   and reconnect. `N` of **2–3** is RECOMMENDED. If the server advertised `keepalive_interval_ms`, the
   client SHOULD derive its threshold from that value; otherwise it MAY assume the 30-second default.
3. On reconnect, a client MUST resume each subscription from its last **durably-persisted** cursor
   (`id_cursor`) so that messages delivered into the dead window are replayed. Because an environment
   may terminate the process with no clean shutdown (see *Process suspension* below), cursors MUST be
   persisted as messages are durably processed — not only on a graceful close. For a newly joined
   group, the initial cursor SHOULD be seeded from the welcome's encrypted
   `WelcomeMetadata.message_cursor`, so a new member neither misses the gap between welcome creation
   and its first subscribe nor backfills pre-join history it cannot decrypt; `0` (from the beginning)
   remains the fallback when no seed is available, with duplicates discarded locally.
4. A client SHOULD prefer adding/removing subscriptions via `Mutate` deltas over opening additional
   streams. For scheduled background windows where a long-lived stream cannot run (e.g. Android
   WorkManager jobs or Doze maintenance windows), a client SHOULD use the bounded catch-up flow
   (server requirement 9) rather than per-topic queries: one `Mutate{ history_only }` from durable
   cursors, half-close, drain to the server's `OK`. While draining a bounded catch-up it has
   half-closed, a client MUST NOT apply its liveness watchdog (client requirement 2) to that stream:
   the node has stopped sending `Ping`s, the drain is bounded, and gRPC's transport-level timeouts
   cover a genuinely dead connection — it simply reads until the node closes with `OK`.

#### Process suspension and mobile lifecycle

A long-lived stream is hostile to environments that suspend the process — notably mobile apps the OS
backgrounds, and browser tabs the engine throttles or freezes. While suspended, the client cannot run
its watchdog or answer `Ping`s, and the OS may tear down the underlying socket; on resume the client
typically holds a dead stream. Clients in such environments:

1. SHOULD treat the stream as a **foreground / online-presence** mechanism. Delivery while the process
   is suspended is out of scope for this RPC and is expected to be handled out of band (e.g. push
   notifications that wake the app for a catch-up sync); this XIP standardizes only the foreground
   subscription protocol.
2. SHOULD, on resume, **reconnect-and-resume from persisted cursors immediately** rather than waiting
   for the watchdog threshold to elapse — driven by a host-supplied lifecycle signal (e.g. an
   app-foreground or `visibilitychange` callback the SDK forwards to the client). The exact API the
   client exposes for this signal is an implementation concern and is **not** standardized here.
3. SHOULD, on resume, **actively probe** the link before trusting it: send a client `Ping` and treat a
   missing `Pong` (or a failed write) as a dead stream and reconnect. This fast path is exactly what
   the request channel makes possible; a unidirectional server-stream can only wait for missing data.
4. SHOULD debounce rapid background→foreground transitions (a brief grace period plus a minimum
   reconnect interval) to avoid connection thrash, and SHOULD measure staleness against a clock that
   advances across suspension (wall-clock), so a resumed process correctly observes the elapsed gap.

### Relationship to existing RPCs

This RPC is **additive**. `SubscribeGroupMessages` and `SubscribeWelcomeMessages` are unchanged.
Clients opt in by calling `Subscribe`. Environments without native bidirectional streaming — notably
the browser, where standard gRPC-Web over `fetch` is limited to unary and server-streaming — MAY
continue using the existing server-streaming RPCs, protected by a client-side liveness watchdog. Such
environments are **not** permanently excluded from this RPC: a full-duplex browser transport that runs
the HTTP/2 stack over a WebSocket (e.g. the `tonic-ws-transport` approach, with a wasm-compiled tonic
client) can carry `Subscribe` in the browser too. Adopting that path is non-normative and tracked
separately, because it requires a WebSocket ingress on the node (or a bridging proxy) and today relies
on experimental tooling. Standard gRPC-Web will not close this gap on its own: bidirectional streaming
over `fetch` is explicitly *not planned*, pending browser **WebTransport** support — which is the more
durable long-term primitive for in-browser full-duplex once its server/client tooling matures.

### Decentralized (d14n) binding

The proto and requirements above are written against the v3 `MlsApi` (`xmtp.mls.api.v1`), but XIP-83 is
a **control protocol**, not a single RPC. The same protocol has a second binding on the decentralized
backend's client-facing `QueryApi` (`xmtp.xmtpv4.message_api`), added as a new bidirectional RPC
alongside the existing server-streaming `SubscribeTopics`:

```protobuf
service QueryApi {
  // ... existing QueryEnvelopes, SubscribeTopics, GetInboxIds, GetNewestEnvelope ...
  rpc Subscribe(stream SubscribeRequest) returns (stream SubscribeResponse) {}
}
```

The **control protocol is identical** — `Mutate` (adds/removes, `history_only`, `mutate_id`),
`Started`, `CatchupComplete`, `TopicsLive`, `Ping` / `Pong`, the catch-up waves, and the half-close
bounded catch-up — and every server and client requirement above applies unchanged. The two bindings
differ only where the backend's data model differs:

- **The resume cursor is a per-originator vector, not a scalar.** A v3 subscription resumes from a
  single monotonic `id_cursor`; a decentralized subscription resumes from a `Cursor`
  (`map<uint32, uint64> node_id_to_sequence_id`), because its envelopes originate from multiple nodes
  and there is no single global sequence. Each `Subscription` therefore carries `last_seen` — the same
  `Cursor` type `SubscribeTopics` already uses — in place of `id_cursor`. The no-redelivery guarantee
  (server requirement 2) is evaluated **per originator**: an envelope is delivered iff its
  `(originator_node_id, originator_sequence_id)` is beyond the subscription's recorded position for
  that originator, with originators absent from the cursor map treated as sequence `0`. "From the
  beginning" is an empty cursor rather than `0`.
- **Delivery is the unified envelope stream.** Responses carry `OriginatorEnvelope`s (the decentralized
  wire type) rather than typed `GroupMessage` / `WelcomeMessage`, and the client demultiplexes by each
  envelope's target topic. `Started` / `CatchupComplete` / `TopicsLive` / `Ping` / `Pong` are
  structurally identical, re-declared in the `xmtpv4` package.
- **Topics need no translation.** Subscriptions already use the XIP-49 kind-prefixed binary topic,
  which *is* the decentralized backend's native topic representation — the convergence this XIP relies
  on elsewhere — so a subscription crosses backends with no reformatting. A topic whose kind the node
  does not serve fails the stream with `INVALID_ARGUMENT`, as on v3.

This binding is **additive**, exactly as on v3: `SubscribeTopics` — the immutable server-streaming
ancestor whose `STARTED` / `CATCHUP_COMPLETE` lifecycle `Started` / `CatchupComplete` echo — is
unchanged, and clients opt in by calling `Subscribe`. Because bidirectional streaming requires HTTP/2,
`QueryApi.Subscribe` serves native clients (which speak HTTP/2 gRPC to the node); browser and other
gRPC-web / connect-web clients, which cannot open a bidirectional stream, remain on `SubscribeTopics`
behind a liveness watchdog — the same division as the v3 browser story above. A node MAY implement
either binding independently; a client falls back on `UNIMPLEMENTED`.

## Rationale

- **Bidirectional, not a second unary stream.** Mutating the subscription in place is the entire
  point — the client→server channel is the natural and only place to carry add/remove deltas without
  a reconnect. A unary-request stream cannot express "and now also this group."
- **Heartbeat as an application payload, not a transport ping.** HTTP/2 PING frames are handled
  inside the transport and never surface to the application, so they cannot feed a client watchdog;
  and a terminating L7 proxy answers them at the edge, so they do not prove the origin is still
  serving the subscription. A `Ping` frame is a real, end-to-end payload that does.
- **Challenge/response (ping/pong), not a one-way heartbeat.** A one-way "still alive" frame tells
  only the *client* that the server is up. Making it a WebSocket-style ping the receiver MUST answer
  proves liveness in **both** directions from one round-trip: the `Ping`'s arrival proves the server
  to the client, and the `Pong`'s arrival proves the client to the server. This is what lets a node
  reliably reap a vanished peer — a suspended mobile client behind a proxy that still ACKs the
  transport produces no `Pong`, so the node closes the stream instead of leaking it. Because either
  side MAY initiate, a client that has just resumed can probe the link immediately instead of waiting
  for the next scheduled server ping.
- **Kind-prefixed topics reuse the decentralized backend's representation.** Subscriptions carry
  the XIP-49 binary topic (one kind byte + raw identifier) with v3's single `id_cursor` — the same
  topics clients already build as cursor-store keys, so nothing new is derived client-side and the
  v3 and decentralized vocabularies converge. One repeated `{topic, id_cursor}` shape extends to
  future streamable kinds (key packages, identity updates) without protocol changes, gated by
  `Started.capabilities`; an earlier draft used per-kind typed fields, replaced during review.
  Mutate-in-place is "stream the filters instead of sending them once." A bidirectional subscribe
  precedent also exists in the legacy API (`Subscribe2`).
- **Lifecycle frames echo the decentralized API.** `Started` / `CatchupComplete` deliberately echo
  the decentralized backend's `SubscribeTopics` response lifecycle (XIP-49 lineage); they are
  dedicated response arms (not an enum with side fields) so frame metadata like
  `keepalive_interval_ms` and the echoed `mutate_id` is unambiguous by construction.
- **Versioned messages.** `SubscribeRequest` / `SubscribeResponse` wrap their payload in
  `oneof version { V1 v1 = 1; }`, matching `GroupMessage` / `WelcomeMessage`, so a future revision can
  restructure the protocol while old peers continue to speak `V1` (and a node can detect a peer's
  version by the populated arm). `Ping` / `Pong` are trivial and version-independent.
- **Rejected alternatives:** (a) unstructured opaque `topic` bytes — or legacy `g-<hex>` / `w-<hex>`
  string topics the client formats itself — that the node cannot introspect; the adopted kind-prefixed
  binary form is still a single `bytes` field, but its leading kind byte lets the node validate and
  route by kind, with no client-side string formatting;
  (b) a per-message sentinel on the existing server-stream gated by a request header — a backward-compat
  hack that does not fix churn; (c) resending the last message as a keepalive — history-dependent and
  stateful on the server; (d) a separate application-level ping RPC — proves a different connection is
  alive, not the subscription; (e) tightening transport keepalives — defeated by terminating proxies
  (the motivating failure); (f) detecting a sequence gap on the next real message — only detects loss
  after the next message, which on a dormant topic may be hours.

## Backward compatibility

This XIP introduces **no incompatibilities**. The `Subscribe` RPC is new; existing subscription RPCs
and their wire formats are untouched. There is no lockstep upgrade: a node MAY add `Subscribe`
independently, and a client MAY adopt it independently — a client that calls `Subscribe` against a
node that does not implement it receives a standard gRPC `UNIMPLEMENTED` and falls back to the
existing RPCs. Because both messages are versioned (`oneof version`), future revisions of `Subscribe`
itself are also non-breaking: a peer negotiates by the `V*` arm it populates and ignores versions it
does not understand. Browser clients, which cannot use bidirectional gRPC over standard gRPC-Web,
remain on the existing server-streaming RPCs (with a client-side watchdog) until and unless a
full-duplex browser transport is adopted (see *Relationship to existing RPCs*); they are unaffected in
the meantime.

## Test cases

1. **Immediate Started.** Open `Subscribe`, send `Mutate{ adds:[{ topic: g1 }] }`. The first frame
   received MUST be `Started`, before any `Messages`.
2. **Idle ping.** With a subscription open and no new messages, the client MUST receive a `Ping`
   within the advertised interval (≤30s), and again each interval while idle.
3. **Ping resets on traffic.** Publish a message at T; the next `Ping` MUST be no earlier than
   T + interval (the idle timer reset).
4. **Server reaps a silent client.** With a subscription open, the client stops answering `Ping`s.
   The node MUST close the stream within its `Pong` deadline.
5. **Client-initiated ping.** The client sends `Ping{ nonce=k }`; the node MUST reply
   `Pong{ nonce=k }`.
6. **Mutate-add catch-up, no reconnect.** With the stream open, send
   `Mutate{ adds:[{ topic: g3, id_cursor: C }] }`. The client MUST receive `g3` messages with
   id > C, with no duplicates, and the stream MUST NOT be torn down.
7. **Mutate-remove.** Send `Mutate{ removes:[g1] }`; the client MUST stop receiving `g1`
   messages.
8. **Watchdog.** Black-hole the connection (transport pings still answered by a proxy). With no frame
   for N× interval, the client MUST close and reconnect, and on reconnect from persisted cursors MUST
   receive any message published during the dead window.
9. **TopicsLive and per-wave CatchupComplete mark the live boundary.** Subscribe `g1` (with
   history) from cursor 0. The client MUST receive a `TopicsLive` containing `g1` after the last
   `g1` history frame and before any `g1` frame published after the marker, then that wave's
   `CatchupComplete` echoing its `mutate_id`. Then `Mutate{ adds:[g2], mutate_id: m }` (with
   history): the client MUST receive `g2`'s history, a `TopicsLive` containing `g2`, and a
   `CatchupComplete` echoing `m` after that marker.
10. **Bounded catch-up.** Subscribe with `Mutate{ adds:[g1@0], history_only: true }` (g1 has
    history) and immediately half-close. The client MUST receive g1's history, a `TopicsLive`
    containing `g1`, and the wave's `CatchupComplete`, after which the node MUST close the stream
    with `OK`. Messages published to `g1` after the marker MUST NOT be delivered.
11. **Resume after suspension.** Freeze the client past the ping interval (simulating OS suspension),
   then resume. The client MUST detect the dead stream (via its resume probe or the watchdog) and
   reconnect from persisted cursors, replaying anything published during suspension; the node MUST
   have reaped the original stream.
12. **Replay after remove.** Subscribe `g1` from cursor 0 and catch up its history. Send
   `Mutate{ removes:[g1] }`, then `Mutate{ adds:[{ topic: g1, id_cursor: 0 }] }`. The client MUST
   receive `g1`'s history a second time — the remove cleared the cursor floor — each occurrence a
   complete catch-up ending in its wave's `CatchupComplete`.
13. **Duplicate adds coalesced.** A single `Mutate` whose `adds` lists the same topic twice MUST be
   treated as one subscription: the topic's history is delivered once, it appears in exactly one
   `TopicsLive`, and the wave emits one `CatchupComplete`.
14. **Unknown version rejected.** A `SubscribeRequest` with no recognized `version` arm populated MUST
   fail the stream with `INVALID_ARGUMENT`, not be silently ignored.

## Reference implementation

Non-normative, and staged. The client-side liveness floor — a `WatchdogStream` combinator that turns
a stale subscription into a reconnect from the persisted cursor — is implemented in `libxmtp`
independently of this RPC and already protects the existing server-streaming subscriptions. The
protocol changes this XIP standardizes are the remaining work: a `Subscribe`-based client that decodes
the response stream (messages, status, and ping/pong), and an `xmtp-node-go` `Subscribe` handler with
a mutable per-connection subscription set and a ping/pong idle ticker. Bringing the browser onto the
same `Subscribe` path — by tunnelling HTTP/2 over a WebSocket so a wasm-compiled tonic client can open
a bidirectional stream — is a separate, later track that also requires a WebSocket ingress (or bridging
proxy) in front of the node.

## Security considerations

This XIP changes only the **transport/subscription** layer. It does **not** alter MLS, message
encryption, or the node trust model. A node already sees subscription topics and ciphertext envelopes
for any stream it serves; carrying more subscriptions on one connection does not grant a node any new
plaintext, because decryption still requires per-installation MLS state the node does not possess.

### Threat model

- **Malicious node suppresses liveness to mask censorship.** A node could keep answering pings while
  withholding real messages, making a censored stream look healthy. The ping proves *liveness*, not
  *completeness*. Mitigation: clients resume from durable per-subscription cursors on every
  (re)connection, so a gap is detected when delivery resumes; completeness against a misbehaving node
  is addressed by the broader decentralized misbehavior/liveness reporting machinery (XIP-49 lineage),
  not by this RPC.
- **Malicious client exhausts node resources** via many streams, an unbounded subscription set,
  high-frequency mutations, or a flood of client `Ping`s each demanding a `Pong`. Mitigation: server
  requirement (6) — nodes MUST bound subscriptions-per-stream, mutation rate, and client-ping rate, and
  reject excess. The server-initiated heartbeat cadence is server-controlled, so a client cannot force
  an expensive ping rate.
- **Mid-stream privilege escalation.** A client might attempt to add a subscription it is not entitled
  to after the stream is established. Mitigation: server requirement (5) — added subscriptions are
  authorized identically to opening-request ones.
- **Connection concentration (gateway use case).** Concentrating many identities' subscriptions on
  one connection raises the value of compromising that connection or its operator. Because MLS is
  end-to-end encrypted, a compromised relay/gateway sees ciphertext and topic metadata only — the
  same exposure any relay already has — and cannot read messages without each identity's MLS keys.
  Operators concentrating identities SHOULD treat the per-identity key material (held outside this
  protocol) as the security boundary. Relatedly, a multiplexer that broadcasts `TopicsLive` frames to
  all of its local consumers reveals co-subscription (that another consumer in the same process is
  subscribed to the same topic); this stays within the process's existing trust boundary, and a
  multiplexer MAY instead route markers only to the consumers that subscribed the topic.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
