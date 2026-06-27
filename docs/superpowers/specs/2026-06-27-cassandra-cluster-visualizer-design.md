# Cassandra Cluster Visualizer — Design Spec

**Date:** 2026-06-27  
**Status:** Approved  
**Scope:** v1 — Cluster topology and basic operations

## 1. Overview

A browser-based, interactive learning tool that visualizes a simplified Apache Cassandra cluster as a token ring. The goal is to help users build intuition for how Cassandra distributes data, places replicas, and reacts to topology changes.

In v1 the tool focuses on **cluster topology and basic operations**: adding/removing nodes, changing replication factor, creating keyspaces, and observing how token ownership and replica placement shift in response. Storage-engine internals (memtables, SSTables, compaction, repair, hinted handoff) are explicitly out of scope for v1 and reserved for future iterations.

## 2. Goals

- Make token-ring partitioning and replica placement tangible.
- Let users experiment with topology changes and immediately see consequences.
- Keep the model simple enough to understand at a glance, but accurate enough to teach real Cassandra concepts.
- Run entirely in the browser with no backend or live Cassandra dependency.

## 3. Non-Goals

- Real-time connection to an actual Cassandra cluster.
- Full simulation of gossip, failure detection, hinted handoff, read/write path, compaction, or repair.
- Production-grade operations tooling.

## 4. Architecture

```
┌─────────────────────────────────────────────┐
│                 React App                    │
│  ┌─────────────┐      ┌──────────────────┐  │
│  │  Control    │      │   Token Ring     │  │
│  │  Panel      │─────▶│   Renderer (D3)  │  │
│  └─────────────┘      └──────────────────┘  │
│  ┌─────────────┐      ┌──────────────────┐  │
│  │  Details    │      │   Event Log      │  │
│  │  Panel      │      │                  │  │
│  └─────────────┘      └──────────────────┘  │
│                                              │
│        ┌──────────────────────┐              │
│        │  Cluster State Store │              │
│        │  (pure reducer tree) │              │
│        └──────────────────────┘              │
└─────────────────────────────────────────────┘
```

- **Frontend:** Single-page React app using TypeScript.
- **State:** A plain in-memory object tree managed through pure reducer functions.
- **Rendering:** D3-powered SVG token ring.
- **Styling:** Tailwind CSS.
- **Testing:** Vitest for reducer logic; component smoke tests where valuable.
- **No backend.**

## 5. Data Model

### 5.1 Cluster

```ts
interface Cluster {
  id: string;
  name: string;
  tokenRange: [number, number]; // [0, 999] in v1
  nodes: Node[];
  keyspaces: Keyspace[];
  events: ClusterEvent[];
}
```

### 5.2 Node

```ts
interface Node {
  id: string;
  name: string;
  tokens: number[];        // sorted token positions this node owns
  status: "up" | "leaving" | "down";
  color: string;           // assigned per node for ring visualization
}
```

- Each node holds one or more token positions. In v1 tokens are integers in the simplified range `0–999`.
- Multiple tokens per node act as a simplified stand-in for vnodes.
- A token position represents the **end** of a range that the node owns (Cassandra-style). The range is everything from the previous token (clockwise) up to and including this token.

### 5.3 Keyspace

```ts
interface Keyspace {
  id: string;
  name: string;
  replicationFactor: number; // RF
}
```

### 5.4 Replica Placement

For a given partition token `t` and replication factor `RF`:

1. Walk clockwise from `t` on the ring.
2. Collect the first distinct `RF` nodes encountered.
3. Those nodes are the replica set for that partition.

This is a simplified version of Cassandra’s SimpleStrategy.

### 5.5 Cluster Event

```ts
interface ClusterEvent {
  id: string;
  timestamp: number;
  message: string;
}
```

## 6. Components

### 6.1 Control Panel

- **Add Node** — adds a node with a randomly assigned token set.
- **Remove Node** — removes the selected node and recalculates ownership.
- **Add Keyspace** — creates a keyspace with a name and RF.
- **Set Replication Factor** — changes RF for the selected keyspace.
- **Rebalance Tokens** — redistributes tokens evenly across nodes.
- **Reset Cluster** — returns to a default small cluster.

### 6.2 Token Ring Renderer

- SVG ring drawn with D3.
- Each node’s owned token ranges are drawn as colored arcs.
- Token positions are marked as small ticks.
- Hovering a range highlights it and shows a tooltip: owner node, start/end token, replica set for the active keyspace.
- Clicking a node selects it and opens details.

### 6.3 Details Panel

- Selected node info: name, tokens, status, owned ranges.
- Active keyspace replica summary.
- Selected partition info when hovering the ring.

### 6.4 Event Log

- Scrollable list of recent actions.
- Examples: "Node node-3 added", "Replication factor for ks1 changed to 3", "Ownership recalculated".

## 7. Key Interactions

| Action | Behavior |
|--------|----------|
| Add node | Assign random token positions, recalculate ownership, append event. |
| Remove node | Remove node, reassign its token ranges to remaining nodes, recalculate replica sets, append event. |
| Add keyspace | Create keyspace with default RF=1. |
| Change RF | Validate RF ≤ node count, recalculate replica sets, append event. |
| Rebalance | Redistribute token positions evenly across existing nodes, append event. |
| Hover ring | Highlight hovered range and show replica set tooltip. |
| Click node | Select node and show details. |

## 8. Error Handling & Edge Cases

- **RF > node count** — show inline warning and prevent the change.
- **Remove last node** — disallow; a cluster must have at least one node.
- **Duplicate keyspace name** — disallow and show inline error.
- **RF = 0** — allowed as an explicit edge case; means no replicas are shown.
- **Single-node cluster** — the single node owns 100% of the ring.
- **Node status** — `leaving` and `down` states are stored but do not affect ownership calculation in v1.

## 9. Tech Stack

- **Build tool:** Vite
- **Framework:** React 18
- **Language:** TypeScript
- **Visualization:** D3 (for ring geometry and scales)
- **Styling:** Tailwind CSS
- **Testing:** Vitest
- **No backend or persistence layer in v1.**

## 10. Testing Strategy

- **Reducer tests (primary):** cover add node, remove node, change RF, rebalance, and replica placement with deterministic token assignments.
- **Component smoke tests:** render Control Panel and verify buttons dispatch actions.
- **Visual ring tests:** manual; verify hover, selection, and rebalance animations.

## 11. Future Extensions (Out of Scope for v1)

- SSTable, memtable, and compaction visualization.
- Repair and streaming simulation.
- Gossip, failure detection, hinted handoff.
- Read/write request routing visualization.
- NetworkTopologyStrategy and rack-aware replica placement.
- Persistence (localStorage) and scenario presets.

## 12. Success Criteria

A user can:

1. Open the app and see a default Cassandra-style token ring.
2. Add a node and observe ownership shift.
3. Change the replication factor and see replica sets update.
4. Hover a token range and read its owner and replicas.
5. Remove a node and see its ranges reassigned.
6. Run the reducer unit tests and see them pass.
