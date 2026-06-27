# Cassandra Cluster Visualizer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based, interactive token-ring visualizer for learning Cassandra cluster topology and basic operations.

**Architecture:** A single-page React + TypeScript app inside `web/`. Cluster state is a plain object managed by a pure reducer. D3 renders an SVG token ring. Controls mutate state; the ring and panels re-render reactively.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS, D3, Vitest, @testing-library/react, jsdom.

## Global Constraints

- Run entirely in the browser with no backend or live Cassandra dependency.
- Token range is simplified to `0–999` integers in v1.
- Replica placement is a simplified clockwise SimpleStrategy.
- Storage-engine internals (memtables, SSTables, compaction, repair, hinted handoff) are out of scope for v1.
- Each task ends with an independently testable deliverable and a commit.
- Use exact file paths shown in each task.

---

## File Structure

```
/Users/nick/Developer/cass-visualize
├── docs/
│   └── superpowers/
│       ├── specs/2026-06-27-cassandra-cluster-visualizer-design.md
│       └── plans/2026-06-27-cassandra-cluster-visualizer-plan.md
└── web/
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── index.css
    │   ├── types/
    │   │   └── cluster.ts
    │   ├── state/
    │   │   ├── clusterReducer.ts
    │   │   └── initialCluster.ts
    │   ├── lib/
    │   │   ├── replicaPlacement.ts
    │   │   └── ringGeometry.ts
    │   ├── hooks/
    │   │   └── useCluster.ts
    │   └── components/
    │       ├── TokenRing.tsx
    │       ├── ControlPanel.tsx
    │       ├── DetailsPanel.tsx
    │       └── EventLog.tsx
    └── tests/
        ├── replicaPlacement.test.ts
        └── clusterReducer.test.ts
```

---

### Task 1: Scaffold the React project

**Files:**
- Create: `web/package.json`
- Create: `web/vite.config.ts`
- Create: `web/tsconfig.json`
- Create: `web/tailwind.config.js`
- Create: `web/postcss.config.js`
- Create: `web/index.html`
- Create: `web/src/main.tsx`
- Create: `web/src/index.css`
- Modify: none
- Test: `npm run test` should run vitest

**Interfaces:**
- Produces: A runnable Vite + React + TS + Tailwind + Vitest project in `web/`.

- [ ] **Step 1: Create Vite project**

```bash
cd /Users/nick/Developer/cass-visualize
npm create vite@latest web -- --template react-ts
```

Expected: `web/` directory created with Vite React TypeScript template.

- [ ] **Step 2: Install dependencies**

```bash
cd /Users/nick/Developer/cass-visualize/web
npm install
npm install d3
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom tailwindcss postcss autoprefixer @types/d3
```

- [ ] **Step 3: Configure Tailwind**

Create `web/tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

Create `web/postcss.config.js`:

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

Replace `web/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-slate-900 text-slate-100;
}
```

- [ ] **Step 4: Configure Vitest**

Replace `web/vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    include: ["tests/**/*.{test,spec}.{js,ts,jsx,tsx}"],
    setupFiles: ["tests/setup.ts"],
  },
});
```

Create `web/tests/setup.ts`:

```ts
import { expect } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);
```

- [ ] **Step 5: Update package.json scripts**

Ensure `web/package.json` scripts include:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  }
}
```

- [ ] **Step 6: Update tsconfig.json**

Replace `web/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src", "tests"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 7: Update index.html title**

Replace the `<title>` in `web/index.html`:

```html
<title>Cassandra Cluster Visualizer</title>
```

- [ ] **Step 8: Verify tests run**

```bash
cd /Users/nick/Developer/cass-visualize/web
npm run test
```

Expected: Vitest runs with no tests found (exit 0).

- [ ] **Step 9: Commit**

```bash
cd /Users/nick/Developer/cass-visualize
git add web/
git commit -m "chore: scaffold Vite React TypeScript project with Tailwind and Vitest"
```

---

### Task 2: Define the data model types

**Files:**
- Create: `web/src/types/cluster.ts`
- Test: `web/tests/typesSmoke.test.ts` (compile-time only)

**Interfaces:**
- Produces: TypeScript interfaces used by all later tasks.

- [ ] **Step 1: Write the types file**

Create `web/src/types/cluster.ts`:

```ts
export type NodeStatus = "up" | "leaving" | "down";

export interface Node {
  id: string;
  name: string;
  tokens: number[];
  status: NodeStatus;
  color: string;
}

export interface Keyspace {
  id: string;
  name: string;
  replicationFactor: number;
}

export interface ClusterEvent {
  id: string;
  timestamp: number;
  message: string;
}

export interface Cluster {
  id: string;
  name: string;
  tokenRange: [number, number];
  nodes: Node[];
  keyspaces: Keyspace[];
  events: ClusterEvent[];
  selectedNodeId: string | null;
  activeKeyspaceId: string | null;
}

export interface TokenRange {
  start: number;
  end: number;
  ownerId: string;
}
```

- [ ] **Step 2: Add a compile-time smoke test**

Create `web/tests/typesSmoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { Cluster, Node, Keyspace } from "../src/types/cluster";

describe("type smoke test", () => {
  it("accepts a minimal cluster", () => {
    const node: Node = {
      id: "n1",
      name: "node-1",
      tokens: [500],
      status: "up",
      color: "#ff0000",
    };
    const ks: Keyspace = {
      id: "ks1",
      name: "system",
      replicationFactor: 1,
    };
    const cluster: Cluster = {
      id: "c1",
      name: "Test Cluster",
      tokenRange: [0, 999],
      nodes: [node],
      keyspaces: [ks],
      events: [],
      selectedNodeId: null,
      activeKeyspaceId: "ks1",
    };
    expect(cluster.nodes).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd /Users/nick/Developer/cass-visualize/web
npm run test
```

Expected: PASS `tests/typesSmoke.test.ts`.

- [ ] **Step 4: Commit**

```bash
cd /Users/nick/Developer/cass-visualize
git add web/src/types/cluster.ts web/tests/typesSmoke.test.ts
git commit -m "feat: add cluster data model types"
```

---

### Task 3: Implement replica placement utilities

**Files:**
- Create: `web/src/lib/replicaPlacement.ts`
- Test: `web/tests/replicaPlacement.test.ts`

**Interfaces:**
- Consumes: `Cluster`, `Node`, `Keyspace`, `TokenRange` from `web/src/types/cluster.ts`.
- Produces:
  - `getAllTokenPoints(nodes: Node[]): { token: number; nodeId: string }[]`
  - `getRangeOwnerToken(token: number, sortedTokens: { token: number; nodeId: string }[]): { token: number; nodeId: string }`
  - `getReplicaNodeIds(partitionToken: number, rf: number, nodes: Node[]): string[]`
  - `getNodeOwnedRanges(nodeId: string, nodes: Node[], tokenRange: [number, number]): TokenRange[]`

- [ ] **Step 1: Write failing tests**

Create `web/tests/replicaPlacement.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  getAllTokenPoints,
  getRangeOwnerToken,
  getReplicaNodeIds,
  getNodeOwnedRanges,
} from "../src/lib/replicaPlacement";
import type { Node } from "../src/types/cluster";

const nodes: Node[] = [
  { id: "a", name: "A", tokens: [250], status: "up", color: "#a00" },
  { id: "b", name: "B", tokens: [500], status: "up", color: "#0a0" },
  { id: "c", name: "C", tokens: [750], status: "up", color: "#00a" },
];

describe("getAllTokenPoints", () => {
  it("returns sorted token-to-node mappings", () => {
    const points = getAllTokenPoints(nodes);
    expect(points).toEqual([
      { token: 250, nodeId: "a" },
      { token: 500, nodeId: "b" },
      { token: 750, nodeId: "c" },
    ]);
  });
});

describe("getRangeOwnerToken", () => {
  it("finds the first token clockwise from a partition token", () => {
    const sorted = getAllTokenPoints(nodes);
    expect(getRangeOwnerToken(0, sorted).nodeId).toBe("a");
    expect(getRangeOwnerToken(251, sorted).nodeId).toBe("b");
    expect(getRangeOwnerToken(751, sorted).nodeId).toBe("a");
  });
});

describe("getReplicaNodeIds", () => {
  it("returns RF distinct nodes clockwise", () => {
    expect(getReplicaNodeIds(100, 2, nodes)).toEqual(["a", "b"]);
    expect(getReplicaNodeIds(600, 3, nodes)).toEqual(["c", "a", "b"]);
  });

  it("returns as many replicas as available when RF exceeds node count", () => {
    expect(getReplicaNodeIds(100, 5, nodes)).toEqual(["a", "b", "c"]);
  });
});

describe("getNodeOwnedRanges", () => {
  it("returns ranges ending at the node's tokens", () => {
    const ranges = getNodeOwnedRanges("a", nodes, [0, 999]);
    expect(ranges).toEqual([
      { start: 751, end: 250, ownerId: "a" },
    ]);
  });

  it("returns multiple ranges for a node with multiple tokens", () => {
    const multi: Node = {
      id: "m",
      name: "M",
      tokens: [200, 600],
      status: "up",
      color: "#000",
    };
    const others: Node[] = [
      { id: "x", name: "X", tokens: [400, 800], status: "up", color: "#fff" },
    ];
    const ranges = getNodeOwnedRanges("m", [multi, others[0]], [0, 999]);
    expect(ranges).toContainEqual({ start: 801, end: 200, ownerId: "m" });
    expect(ranges).toContainEqual({ start: 401, end: 600, ownerId: "m" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/nick/Developer/cass-visualize/web
npm run test
```

Expected: FAIL with module not found or functions not defined.

- [ ] **Step 3: Implement replica placement**

Create `web/src/lib/replicaPlacement.ts`:

```ts
import type { Node, TokenRange } from "../types/cluster";

export function getAllTokenPoints(
  nodes: Node[]
): { token: number; nodeId: string }[] {
  return nodes
    .flatMap((node) => node.tokens.map((token) => ({ token, nodeId: node.id })))
    .sort((a, b) => a.token - b.token);
}

export function getRangeOwnerToken(
  partitionToken: number,
  sortedTokens: { token: number; nodeId: string }[]
): { token: number; nodeId: string } {
  if (sortedTokens.length === 0) {
    throw new Error("No tokens on the ring");
  }
  for (const point of sortedTokens) {
    if (partitionToken <= point.token) {
      return point;
    }
  }
  return sortedTokens[0];
}

export function getReplicaNodeIds(
  partitionToken: number,
  rf: number,
  nodes: Node[]
): string[] {
  const sorted = getAllTokenPoints(nodes);
  if (sorted.length === 0 || rf <= 0) return [];

  const replicas: string[] = [];
  let startIndex = sorted.findIndex((p) => partitionToken <= p.token);
  if (startIndex === -1) startIndex = 0;

  for (let i = 0; i < sorted.length && replicas.length < rf; i++) {
    const point = sorted[(startIndex + i) % sorted.length];
    if (!replicas.includes(point.nodeId)) {
      replicas.push(point.nodeId);
    }
  }

  return replicas;
}

export function getNodeOwnedRanges(
  nodeId: string,
  nodes: Node[],
  tokenRange: [number, number]
): TokenRange[] {
  const sorted = getAllTokenPoints(nodes);
  if (sorted.length === 0) return [];

  return nodes
    .find((n) => n.id === nodeId)
    ?.tokens.map((token) => {
      const tokenIndex = sorted.findIndex(
        (p) => p.token === token && p.nodeId === nodeId
      );
      const prevIndex =
        (tokenIndex - 1 + sorted.length) % sorted.length;
      const start = (sorted[prevIndex].token + 1) % (tokenRange[1] + 1);
      return { start, end: token, ownerId: nodeId };
    }) ?? [];
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/nick/Developer/cass-visualize/web
npm run test
```

Expected: PASS all replicaPlacement tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/nick/Developer/cass-visualize
git add web/src/lib/replicaPlacement.ts web/tests/replicaPlacement.test.ts
git commit -m "feat: add replica placement utilities and tests"
```

---

### Task 4: Implement the cluster reducer

**Files:**
- Create: `web/src/state/clusterReducer.ts`
- Test: `web/tests/clusterReducer.test.ts`

**Interfaces:**
- Consumes: `Cluster`, `Node`, `Keyspace`, `ClusterEvent` from `web/src/types/cluster.ts`; `getAllTokenPoints` from `web/src/lib/replicaPlacement.ts`.
- Produces:
  - `ClusterAction` union type
  - `clusterReducer(state: Cluster, action: ClusterAction): Cluster`
  - Helpers: `createNode`, `createKeyspace`, `distributeTokensEvenly`, `generateId`, `palette`

- [ ] **Step 1: Write failing tests**

Create `web/tests/clusterReducer.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { clusterReducer, createInitialCluster } from "../src/state/clusterReducer";
import type { Cluster } from "../src/types/cluster";

const initial = createInitialCluster();

describe("clusterReducer", () => {
  it("adds a node", () => {
    const next = clusterReducer(initial, { type: "ADD_NODE" });
    expect(next.nodes).toHaveLength(initial.nodes.length + 1);
    expect(next.events[0].message).toMatch(/added/);
  });

  it("removes a node", () => {
    const withNode = clusterReducer(initial, { type: "ADD_NODE" });
    const target = withNode.nodes[withNode.nodes.length - 1].id;
    const next = clusterReducer(withNode, { type: "REMOVE_NODE", nodeId: target });
    expect(next.nodes).toHaveLength(initial.nodes.length);
    expect(next.events[0].message).toMatch(/removed/);
  });

  it("prevents removing the last node", () => {
    const oneNode = { ...initial, nodes: [initial.nodes[0]] };
    const next = clusterReducer(oneNode, { type: "REMOVE_NODE", nodeId: initial.nodes[0].id });
    expect(next.nodes).toHaveLength(1);
    expect(next.events[0].message).toMatch(/cannot remove the last node/);
  });

  it("adds a keyspace", () => {
    const next = clusterReducer(initial, { type: "ADD_KEYSPACE", name: "logs", replicationFactor: 2 });
    expect(next.keyspaces).toHaveLength(initial.keyspaces.length + 1);
    expect(next.keyspaces.find((k) => k.name === "logs")?.replicationFactor).toBe(2);
  });

  it("sets replication factor", () => {
    const ks = initial.keyspaces[0];
    const next = clusterReducer(initial, {
      type: "SET_REPLICATION_FACTOR",
      keyspaceId: ks.id,
      replicationFactor: 2,
    });
    expect(next.keyspaces[0].replicationFactor).toBe(2);
  });

  it("clamps RF to node count", () => {
    const ks = initial.keyspaces[0];
    const next = clusterReducer(initial, {
      type: "SET_REPLICATION_FACTOR",
      keyspaceId: ks.id,
      replicationFactor: 999,
    });
    expect(next.keyspaces[0].replicationFactor).toBe(initial.nodes.length);
    expect(next.events[0].message).toMatch(/clamped/);
  });

  it("rebalances tokens", () => {
    const next = clusterReducer(initial, { type: "REBALANCE_TOKENS" });
    expect(next.events[0].message).toMatch(/rebalanced/);
  });

  it("selects a node", () => {
    const next = clusterReducer(initial, { type: "SELECT_NODE", nodeId: initial.nodes[0].id });
    expect(next.selectedNodeId).toBe(initial.nodes[0].id);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/nick/Developer/cass-visualize/web
npm run test
```

Expected: FAIL with module/functions not found.

- [ ] **Step 3: Implement the reducer**

Create `web/src/state/clusterReducer.ts`:

```ts
import type { Cluster, ClusterEvent, Keyspace, Node } from "../types/cluster";

const palette = [
  "#ef4444", // red-500
  "#22c55e", // green-500
  "#3b82f6", // blue-500
  "#f59e0b", // amber-500
  "#a855f7", // purple-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#84cc16", // lime-500
];

function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function now(): number {
  return Date.now();
}

function addEvent(events: ClusterEvent[], message: string): ClusterEvent[] {
  return [
    { id: generateId("evt"), timestamp: now(), message },
    ...events.slice(0, 99),
  ];
}

function distributeTokensEvenly(nodeCount: number, tokenRange: [number, number]): number[][] {
  if (nodeCount === 0) return [];
  const [min, max] = tokenRange;
  const span = max - min + 1;
  const step = Math.floor(span / nodeCount);
  const tokens: number[][] = Array.from({ length: nodeCount }, () => []);
  for (let i = 1; i <= nodeCount; i++) {
    tokens[i - 1].push(min + i * step - 1);
  }
  return tokens;
}

export function createInitialCluster(): Cluster {
  const tokenRange: [number, number] = [0, 999];
  const nodeCount = 3;
  const tokensPerNode = distributeTokensEvenly(nodeCount, tokenRange);
  const nodes: Node[] = tokensPerNode.map((tokens, i) => ({
    id: generateId("node"),
    name: `node-${i + 1}`,
    tokens,
    status: "up",
    color: palette[i % palette.length],
  }));
  const keyspace: Keyspace = {
    id: generateId("ks"),
    name: "demo",
    replicationFactor: 1,
  };
  return {
    id: generateId("cluster"),
    name: "Demo Cluster",
    tokenRange,
    nodes,
    keyspaces: [keyspace],
    events: addEvent([], "Cluster initialized with 3 nodes"),
    selectedNodeId: null,
    activeKeyspaceId: keyspace.id,
  };
}

export type ClusterAction =
  | { type: "ADD_NODE" }
  | { type: "REMOVE_NODE"; nodeId: string }
  | { type: "ADD_KEYSPACE"; name: string; replicationFactor: number }
  | { type: "SET_REPLICATION_FACTOR"; keyspaceId: string; replicationFactor: number }
  | { type: "REBALANCE_TOKENS" }
  | { type: "RESET_CLUSTER" }
  | { type: "SELECT_NODE"; nodeId: string | null }
  | { type: "SET_ACTIVE_KEYSPACE"; keyspaceId: string };

export function clusterReducer(state: Cluster, action: ClusterAction): Cluster {
  switch (action.type) {
    case "ADD_NODE": {
      const newTokens = distributeTokensEvenly(state.nodes.length + 1, state.tokenRange)
        .pop() ?? [Math.floor(Math.random() * 1000)];
      const newNode: Node = {
        id: generateId("node"),
        name: `node-${state.nodes.length + 1}`,
        tokens: newTokens,
        status: "up",
        color: palette[state.nodes.length % palette.length],
      };
      return {
        ...state,
        nodes: [...state.nodes, newNode],
        events: addEvent(state.events, `Node ${newNode.name} added`),
      };
    }

    case "REMOVE_NODE": {
      if (state.nodes.length <= 1) {
        return {
          ...state,
          events: addEvent(state.events, "Cannot remove the last node"),
        };
      }
      const removed = state.nodes.find((n) => n.id === action.nodeId);
      const nodes = state.nodes.filter((n) => n.id !== action.nodeId);
      return {
        ...state,
        nodes,
        selectedNodeId: state.selectedNodeId === action.nodeId ? null : state.selectedNodeId,
        events: addEvent(state.events, `Node ${removed?.name ?? action.nodeId} removed`),
      };
    }

    case "ADD_KEYSPACE": {
      if (state.keyspaces.some((k) => k.name === action.name)) {
        return {
          ...state,
          events: addEvent(state.events, `Keyspace ${action.name} already exists`),
        };
      }
      const newKs: Keyspace = {
        id: generateId("ks"),
        name: action.name,
        replicationFactor: Math.max(0, Math.min(action.replicationFactor, state.nodes.length)),
      };
      return {
        ...state,
        keyspaces: [...state.keyspaces, newKs],
        activeKeyspaceId: newKs.id,
        events: addEvent(state.events, `Keyspace ${newKs.name} created with RF=${newKs.replicationFactor}`),
      };
    }

    case "SET_REPLICATION_FACTOR": {
      const clamped = Math.max(0, Math.min(action.replicationFactor, state.nodes.length));
      const keyspaces = state.keyspaces.map((k) =>
        k.id === action.keyspaceId ? { ...k, replicationFactor: clamped } : k
      );
      const changed = keyspaces.find((k) => k.id === action.keyspaceId);
      const message =
        changed && changed.replicationFactor !== action.replicationFactor
          ? `RF for ${changed.name} clamped to ${clamped}`
          : `RF for ${changed?.name ?? action.keyspaceId} set to ${clamped}`;
      return {
        ...state,
        keyspaces,
        events: addEvent(state.events, message),
      };
    }

    case "REBALANCE_TOKENS": {
      const tokensPerNode = distributeTokensEvenly(state.nodes.length, state.tokenRange);
      const nodes = state.nodes.map((node, i) => ({
        ...node,
        tokens: tokensPerNode[i] ?? [],
      }));
      return {
        ...state,
        nodes,
        events: addEvent(state.events, "Tokens rebalanced across nodes"),
      };
    }

    case "RESET_CLUSTER": {
      const fresh = createInitialCluster();
      return { ...fresh, id: state.id, name: state.name };
    }

    case "SELECT_NODE": {
      return { ...state, selectedNodeId: action.nodeId };
    }

    case "SET_ACTIVE_KEYSPACE": {
      return { ...state, activeKeyspaceId: action.keyspaceId };
    }

    default:
      return state;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/nick/Developer/cass-visualize/web
npm run test
```

Expected: PASS all clusterReducer tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/nick/Developer/cass-visualize
git add web/src/state/clusterReducer.ts web/tests/clusterReducer.test.ts
git commit -m "feat: add cluster state reducer and tests"
```

---

### Task 5: Create the useCluster hook

**Files:**
- Create: `web/src/hooks/useCluster.ts`
- Test: none (thin wrapper)

**Interfaces:**
- Consumes: `Cluster`, `ClusterAction`, `clusterReducer`, `createInitialCluster`.
- Produces: `useCluster(): { cluster: Cluster; dispatch: React.Dispatch<ClusterAction> }`.

- [ ] **Step 1: Implement the hook**

Create `web/src/hooks/useCluster.ts`:

```ts
import { useReducer } from "react";
import { clusterReducer, createInitialCluster } from "../state/clusterReducer";

export function useCluster() {
  const [cluster, dispatch] = useReducer(clusterReducer, null, createInitialCluster);
  return { cluster, dispatch };
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/nick/Developer/cass-visualize
git add web/src/hooks/useCluster.ts
git commit -m "feat: add useCluster hook"
```

---

### Task 6: Add D3 ring geometry helpers

**Files:**
- Create: `web/src/lib/ringGeometry.ts`
- Test: `web/tests/ringGeometry.test.ts`

**Interfaces:**
- Consumes: `Node`, `TokenRange` from `web/src/types/cluster.ts`; `getNodeOwnedRanges` from `web/src/lib/replicaPlacement.ts`.
- Produces:
  - `ArcSegment { nodeId; startAngle; endAngle; startToken; endToken; color }`
  - `getRingArcs(nodes, tokenRange, size): ArcSegment[]`
  - `RingDimensions` and `getRingDimensions(size)`

- [ ] **Step 1: Write failing tests**

Create `web/tests/ringGeometry.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getRingArcs } from "../src/lib/ringGeometry";
import type { Node } from "../src/types/cluster";

const nodes: Node[] = [
  { id: "a", name: "A", tokens: [250], status: "up", color: "#a00" },
  { id: "b", name: "B", tokens: [500], status: "up", color: "#0a0" },
  { id: "c", name: "C", tokens: [750], status: "up", color: "#00a" },
];

describe("getRingArcs", () => {
  it("returns one arc per node range", () => {
    const arcs = getRingArcs(nodes, [0, 999], 200);
    expect(arcs).toHaveLength(3);
    const a = arcs.find((arc) => arc.nodeId === "a");
    expect(a).toBeDefined();
    expect(a!.startAngle).toBeLessThan(a!.endAngle);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/nick/Developer/cass-visualize/web
npm run test
```

Expected: FAIL module not found.

- [ ] **Step 3: Implement ring geometry**

Create `web/src/lib/ringGeometry.ts`:

```ts
import type { Node, TokenRange } from "../types/cluster";
import { getNodeOwnedRanges } from "./replicaPlacement";

export interface ArcSegment {
  nodeId: string;
  startAngle: number;
  endAngle: number;
  startToken: number;
  endToken: number;
  color: string;
}

function tokenToAngle(token: number, tokenRange: [number, number]): number {
  const [min, max] = tokenRange;
  const ratio = (token - min) / (max - min + 1);
  return ratio * 2 * Math.PI;
}

function normalizeRange(range: TokenRange, tokenRange: [number, number]): { start: number; end: number } {
  const [min, max] = tokenRange;
  let start = range.start;
  let end = range.end;
  if (end < start) {
    end += max - min + 1;
  }
  return { start, end };
}

export function getRingArcs(
  nodes: Node[],
  tokenRange: [number, number],
  size: number
): ArcSegment[] {
  const arcs: ArcSegment[] = [];
  for (const node of nodes) {
    const ranges = getNodeOwnedRanges(node.id, nodes, tokenRange);
    for (const range of ranges) {
      const { start, end } = normalizeRange(range, tokenRange);
      arcs.push({
        nodeId: node.id,
        startAngle: tokenToAngle(start, tokenRange),
        endAngle: tokenToAngle(end, tokenRange),
        startToken: range.start,
        endToken: range.end,
        color: node.color,
      });
    }
  }
  return arcs;
}

export interface RingDimensions {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  radius: number;
  strokeWidth: number;
}

export function getRingDimensions(size: number): RingDimensions {
  return {
    width: size,
    height: size,
    centerX: size / 2,
    centerY: size / 2,
    radius: size * 0.4,
    strokeWidth: size * 0.12,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/nick/Developer/cass-visualize/web
npm run test
```

Expected: PASS ringGeometry tests.

- [ ] **Step 5: Commit**

```bash
cd /Users/nick/Developer/cass-visualize
git add web/src/lib/ringGeometry.ts web/tests/ringGeometry.test.ts
git commit -m "feat: add D3 ring geometry helpers and tests"
```

---

### Task 7: Build the TokenRing component

**Files:**
- Create: `web/src/components/TokenRing.tsx`
- Test: `web/tests/TokenRing.test.tsx` (smoke render)

**Interfaces:**
- Consumes: `Cluster` from `web/src/types/cluster.ts`; `getRingArcs`, `getRingDimensions` from `web/src/lib/ringGeometry.ts`; `getReplicaNodeIds` from `web/src/lib/replicaPlacement.ts`.
- Produces: `TokenRing` React component with hover tooltips showing owner, range, and replicas.

- [ ] **Step 1: Write a smoke test**

Create `web/tests/TokenRing.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TokenRing } from "../src/components/TokenRing";
import { createInitialCluster } from "../src/state/clusterReducer";

describe("TokenRing", () => {
  it("renders an SVG", () => {
    const cluster = createInitialCluster();
    render(<TokenRing cluster={cluster} onSelectNode={() => {}} highlightedNodeId={null} />);
    expect(screen.getByRole("img", { hidden: true })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/nick/Developer/cass-visualize/web
npm run test
```

Expected: FAIL module not found.

- [ ] **Step 3: Implement the component**

Create `web/src/components/TokenRing.tsx`:

```tsx
import { useMemo, useState } from "react";
import * as d3 from "d3";
import type { Cluster } from "../types/cluster";
import { getRingArcs, getRingDimensions } from "../lib/ringGeometry";
import { getReplicaNodeIds } from "../lib/replicaPlacement";

interface TokenRingProps {
  cluster: Cluster;
  onSelectNode: (nodeId: string | null) => void;
  highlightedNodeId: string | null;
}

export function TokenRing({ cluster, onSelectNode, highlightedNodeId }: TokenRingProps) {
  const size = 320;
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const dims = useMemo(() => getRingDimensions(size), [size]);
  const activeKeyspace = cluster.keyspaces.find((k) => k.id === cluster.activeKeyspaceId);
  const rf = activeKeyspace?.replicationFactor ?? 1;

  const arcs = useMemo(
    () => getRingArcs(cluster.nodes, cluster.tokenRange, size),
    [cluster.nodes, cluster.tokenRange, size]
  );

  const arcGenerator = d3
    .arc<{
      startAngle: number;
      endAngle: number;
      innerRadius: number;
      outerRadius: number;
    }>()
    .innerRadius(dims.radius - dims.strokeWidth / 2)
    .outerRadius(dims.radius + dims.strokeWidth / 2)
    .startAngle((d) => d.startAngle)
    .endAngle((d) => d.endAngle);

  return (
    <svg
      width={dims.width}
      height={dims.height}
      viewBox={`0 0 ${dims.width} ${dims.height}`}
      role="img"
      aria-label="Cassandra token ring"
      className="mx-auto"
    >
      <g transform={`translate(${dims.centerX}, ${dims.centerY})`}>
        {arcs.map((arc, i) => {
          const isHighlighted = highlightedNodeId === arc.nodeId || hoveredNodeId === arc.nodeId;
          const opacity = (highlightedNodeId || hoveredNodeId) && !isHighlighted ? 0.3 : 1;
          const ownerName = cluster.nodes.find((n) => n.id === arc.nodeId)?.name ?? arc.nodeId;
          const midpoint = arc.startToken;
          const replicas = getReplicaNodeIds(midpoint, rf, cluster.nodes);
          const replicaNames = replicas.map((id) => cluster.nodes.find((n) => n.id === id)?.name ?? id);
          return (
            <path
              key={`${arc.nodeId}-${i}`}
              d={
                arcGenerator({
                  startAngle: arc.startAngle - Math.PI / 2,
                  endAngle: arc.endAngle - Math.PI / 2,
                  innerRadius: dims.radius - dims.strokeWidth / 2,
                  outerRadius: dims.radius + dims.strokeWidth / 2,
                }) ?? undefined
              }
              fill={arc.color}
              opacity={opacity}
              stroke="#0f172a"
              strokeWidth={2}
              className="cursor-pointer transition-opacity hover:opacity-80"
              onClick={() => onSelectNode(arc.nodeId)}
              onMouseEnter={() => setHoveredNodeId(arc.nodeId)}
              onMouseLeave={() => setHoveredNodeId(null)}
            >
              <title>
                {`Owner: ${ownerName}\nRange: ${arc.startToken} → ${arc.endToken}\nReplicas (RF=${rf}): ${replicaNames.join(", ") || "none"}`}
              </title>
            </path>
          );
        })}
        {cluster.nodes.map((node) => {
          const tokenAngles = node.tokens.map((t) => {
            const ratio = t / (cluster.tokenRange[1] - cluster.tokenRange[0] + 1);
            return ratio * 2 * Math.PI - Math.PI / 2;
          });
          return tokenAngles.map((angle, i) => {
            const x = Math.cos(angle) * dims.radius;
            const y = Math.sin(angle) * dims.radius;
            return (
              <circle
                key={`${node.id}-tick-${i}`}
                cx={x}
                cy={y}
                r={3}
                fill="#fff"
              />
            );
          });
        })}
      </g>
    </svg>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/nick/Developer/cass-visualize/web
npm run test
```

Expected: PASS TokenRing smoke test.

- [ ] **Step 5: Commit**

```bash
cd /Users/nick/Developer/cass-visualize
git add web/src/components/TokenRing.tsx web/tests/TokenRing.test.tsx
git commit -m "feat: add TokenRing SVG component"
```

---

### Task 8: Build the ControlPanel component

**Files:**
- Create: `web/src/components/ControlPanel.tsx`
- Test: `web/tests/ControlPanel.test.tsx` (smoke render + button clicks)

**Interfaces:**
- Consumes: `Cluster`, `ClusterAction`.
- Produces: `ControlPanel` React component.

- [ ] **Step 1: Write smoke tests**

Create `web/tests/ControlPanel.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ControlPanel } from "../src/components/ControlPanel";
import { createInitialCluster } from "../src/state/clusterReducer";

describe("ControlPanel", () => {
  it("renders controls and dispatches add node", () => {
    const dispatch = vi.fn();
    const cluster = createInitialCluster();
    render(<ControlPanel cluster={cluster} dispatch={dispatch} />);
    fireEvent.click(screen.getByRole("button", { name: /add node/i }));
    expect(dispatch).toHaveBeenCalledWith({ type: "ADD_NODE" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/nick/Developer/cass-visualize/web
npm run test
```

Expected: FAIL module not found.

- [ ] **Step 3: Implement the component**

Create `web/src/components/ControlPanel.tsx`:

```tsx
import { useState } from "react";
import type { Cluster } from "../types/cluster";
import type { ClusterAction } from "../state/clusterReducer";

interface ControlPanelProps {
  cluster: Cluster;
  dispatch: React.Dispatch<ClusterAction>;
}

export function ControlPanel({ cluster, dispatch }: ControlPanelProps) {
  const [newKeyspaceName, setNewKeyspaceName] = useState("");
  const [newKeyspaceRf, setNewKeyspaceRf] = useState(1);

  const activeKeyspace = cluster.keyspaces.find((k) => k.id === cluster.activeKeyspaceId);

  return (
    <div className="space-y-4 rounded-lg bg-slate-800 p-4">
      <h2 className="text-lg font-semibold">Controls</h2>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => dispatch({ type: "ADD_NODE" })}
          className="rounded bg-blue-600 px-3 py-1 text-sm hover:bg-blue-500"
        >
          Add Node
        </button>
        <button
          onClick={() => dispatch({ type: "REBALANCE_TOKENS" })}
          className="rounded bg-emerald-600 px-3 py-1 text-sm hover:bg-emerald-500"
        >
          Rebalance Tokens
        </button>
        <button
          onClick={() => dispatch({ type: "RESET_CLUSTER" })}
          className="rounded bg-slate-600 px-3 py-1 text-sm hover:bg-slate-500"
        >
          Reset Cluster
        </button>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-slate-300">Active Keyspace</h3>
        <select
          value={cluster.activeKeyspaceId ?? ""}
          onChange={(e) => dispatch({ type: "SET_ACTIVE_KEYSPACE", keyspaceId: e.target.value })}
          className="w-full rounded bg-slate-700 px-2 py-1 text-sm"
        >
          {cluster.keyspaces.map((ks) => (
            <option key={ks.id} value={ks.id}>
              {ks.name} (RF={ks.replicationFactor})
            </option>
          ))}
        </select>
      </div>

      {activeKeyspace && (
        <div>
          <label className="mb-1 block text-sm text-slate-300">
            Replication Factor (max {cluster.nodes.length})
          </label>
          <input
            type="range"
            min={0}
            max={cluster.nodes.length}
            value={activeKeyspace.replicationFactor}
            onChange={(e) =>
              dispatch({
                type: "SET_REPLICATION_FACTOR",
                keyspaceId: activeKeyspace.id,
                replicationFactor: Number(e.target.value),
              })
            }
            className="w-full"
          />
          <div className="text-right text-sm">{activeKeyspace.replicationFactor}</div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-medium text-slate-300">New Keyspace</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="name"
            value={newKeyspaceName}
            onChange={(e) => setNewKeyspaceName(e.target.value)}
            className="flex-1 rounded bg-slate-700 px-2 py-1 text-sm"
          />
          <input
            type="number"
            min={0}
            max={cluster.nodes.length}
            value={newKeyspaceRf}
            onChange={(e) => setNewKeyspaceRf(Number(e.target.value))}
            className="w-16 rounded bg-slate-700 px-2 py-1 text-sm"
          />
          <button
            onClick={() => {
              if (!newKeyspaceName.trim()) return;
              dispatch({
                type: "ADD_KEYSPACE",
                name: newKeyspaceName.trim(),
                replicationFactor: newKeyspaceRf,
              });
              setNewKeyspaceName("");
              setNewKeyspaceRf(1);
            }}
            className="rounded bg-blue-600 px-3 py-1 text-sm hover:bg-blue-500"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/nick/Developer/cass-visualize/web
npm run test
```

Expected: PASS ControlPanel test.

- [ ] **Step 5: Commit**

```bash
cd /Users/nick/Developer/cass-visualize
git add web/src/components/ControlPanel.tsx web/tests/ControlPanel.test.tsx
git commit -m "feat: add ControlPanel component"
```

---

### Task 9: Build the DetailsPanel component

**Files:**
- Create: `web/src/components/DetailsPanel.tsx`
- Test: `web/tests/DetailsPanel.test.tsx` (smoke render)

**Interfaces:**
- Consumes: `Cluster` from `web/src/types/cluster.ts`; `getNodeOwnedRanges` from `web/src/lib/replicaPlacement.ts`.
- Produces: `DetailsPanel` React component.

- [ ] **Step 1: Write a smoke test**

Create `web/tests/DetailsPanel.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DetailsPanel } from "../src/components/DetailsPanel";
import { createInitialCluster } from "../src/state/clusterReducer";

describe("DetailsPanel", () => {
  it("renders cluster summary when no node selected", () => {
    const cluster = createInitialCluster();
    render(<DetailsPanel cluster={cluster} />);
    expect(screen.getByText(/nodes/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/nick/Developer/cass-visualize/web
npm run test
```

Expected: FAIL module not found.

- [ ] **Step 3: Implement the component**

Create `web/src/components/DetailsPanel.tsx`:

```tsx
import type { Cluster } from "../types/cluster";
import { getNodeOwnedRanges } from "../lib/replicaPlacement";

interface DetailsPanelProps {
  cluster: Cluster;
}

export function DetailsPanel({ cluster }: DetailsPanelProps) {
  const selectedNode = cluster.nodes.find((n) => n.id === cluster.selectedNodeId);
  const activeKeyspace = cluster.keyspaces.find((k) => k.id === cluster.activeKeyspaceId);

  return (
    <div className="rounded-lg bg-slate-800 p-4">
      <h2 className="text-lg font-semibold">Details</h2>
      {selectedNode ? (
        <div className="mt-2 space-y-2 text-sm">
          <div>
            <span className="font-medium">Name:</span> {selectedNode.name}
          </div>
          <div>
            <span className="font-medium">Status:</span>{" "}
            <span className="capitalize">{selectedNode.status}</span>
          </div>
          <div>
            <span className="font-medium">Tokens:</span>{" "}
            {selectedNode.tokens.join(", ")}
          </div>
          <div>
            <span className="font-medium">Owned ranges:</span>
            <ul className="ml-4 list-disc text-slate-300">
              {getNodeOwnedRanges(selectedNode.id, cluster.nodes, cluster.tokenRange).map(
                (range, i) => (
                  <li key={i}>
                    {range.start} → {range.end}
                  </li>
                )
              )}
            </ul>
          </div>
        </div>
      ) : (
        <div className="mt-2 space-y-2 text-sm text-slate-300">
          <div>Cluster: {cluster.name}</div>
          <div>Nodes: {cluster.nodes.length}</div>
          <div>Keyspaces: {cluster.keyspaces.length}</div>
          {activeKeyspace && (
            <div>
              Active keyspace: {activeKeyspace.name} (RF={activeKeyspace.replicationFactor})
            </div>
          )}
          <div className="text-xs text-slate-400">Click a node on the ring to see details.</div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/nick/Developer/cass-visualize/web
npm run test
```

Expected: PASS DetailsPanel test.

- [ ] **Step 5: Commit**

```bash
cd /Users/nick/Developer/cass-visualize
git add web/src/components/DetailsPanel.tsx web/tests/DetailsPanel.test.tsx
git commit -m "feat: add DetailsPanel component"
```

---

### Task 10: Build the EventLog component

**Files:**
- Create: `web/src/components/EventLog.tsx`
- Test: `web/tests/EventLog.test.tsx` (smoke render)

**Interfaces:**
- Consumes: `ClusterEvent` array.
- Produces: `EventLog` React component.

- [ ] **Step 1: Write a smoke test**

Create `web/tests/EventLog.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventLog } from "../src/components/EventLog";

describe("EventLog", () => {
  it("renders events", () => {
    const events = [
      { id: "e1", timestamp: Date.now(), message: "Node added" },
    ];
    render(<EventLog events={events} />);
    expect(screen.getByText(/node added/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/nick/Developer/cass-visualize/web
npm run test
```

Expected: FAIL module not found.

- [ ] **Step 3: Implement the component**

Create `web/src/components/EventLog.tsx`:

```tsx
import type { ClusterEvent } from "../types/cluster";

interface EventLogProps {
  events: ClusterEvent[];
}

export function EventLog({ events }: EventLogProps) {
  return (
    <div className="rounded-lg bg-slate-800 p-4">
      <h2 className="text-lg font-semibold">Event Log</h2>
      <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm">
        {events.map((event) => (
          <li key={event.id} className="text-slate-300">
            <span className="text-xs text-slate-500">
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>{" "}
            {event.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/nick/Developer/cass-visualize/web
npm run test
```

Expected: PASS EventLog test.

- [ ] **Step 5: Commit**

```bash
cd /Users/nick/Developer/cass-visualize
git add web/src/components/EventLog.tsx web/tests/EventLog.test.tsx
git commit -m "feat: add EventLog component"
```

---

### Task 11: Wire up App.tsx

**Files:**
- Modify: `web/src/App.tsx`
- Test: `web/tests/App.test.tsx` (smoke render)

**Interfaces:**
- Consumes: `useCluster` from `web/src/hooks/useCluster.ts`; `TokenRing`, `ControlPanel`, `DetailsPanel`, `EventLog` components.
- Produces: The main app layout.

- [ ] **Step 1: Write a smoke test**

Create `web/tests/App.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "../src/App";

describe("App", () => {
  it("renders the visualizer", () => {
    render(<App />);
    expect(screen.getByText(/cassandra cluster visualizer/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { hidden: true })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/nick/Developer/cass-visualize/web
npm run test
```

Expected: FAIL assertions fail because App is the default Vite template.

- [ ] **Step 3: Implement App.tsx**

Replace `web/src/App.tsx`:

```tsx
import { useCluster } from "./hooks/useCluster";
import { TokenRing } from "./components/TokenRing";
import { ControlPanel } from "./components/ControlPanel";
import { DetailsPanel } from "./components/DetailsPanel";
import { EventLog } from "./components/EventLog";

function App() {
  const { cluster, dispatch } = useCluster();

  return (
    <div className="min-h-screen p-4">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold">Cassandra Cluster Visualizer</h1>
        <p className="text-sm text-slate-400">Interactive token-ring topology for learning</p>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <TokenRing
            cluster={cluster}
            onSelectNode={(id) => dispatch({ type: "SELECT_NODE", nodeId: id })}
            highlightedNodeId={cluster.selectedNodeId}
          />
        </section>

        <aside className="space-y-4">
          <ControlPanel cluster={cluster} dispatch={dispatch} />
          <DetailsPanel cluster={cluster} />
          <EventLog events={cluster.events} />
        </aside>
      </main>
    </div>
  );
}

export default App;
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/nick/Developer/cass-visualize/web
npm run test
```

Expected: PASS App test.

- [ ] **Step 5: Commit**

```bash
cd /Users/nick/Developer/cass-visualize
git add web/src/App.tsx web/tests/App.test.tsx
git commit -m "feat: wire up main App layout"
```

---

### Task 12: Add remove-node controls

**Files:**
- Modify: `web/src/components/ControlPanel.tsx`
- Test: existing tests continue to pass

**Interfaces:**
- Consumes: `Cluster`, `ClusterAction`.
- Produces: Remove-node button for the selected node.

- [ ] **Step 1: Add remove selected node button to ControlPanel**

Append inside the controls `div` in `web/src/components/ControlPanel.tsx` (after the reset button):

```tsx
<button
  onClick={() => {
    if (cluster.selectedNodeId) {
      dispatch({ type: "REMOVE_NODE", nodeId: cluster.selectedNodeId });
    }
  }}
  disabled={!cluster.selectedNodeId || cluster.nodes.length <= 1}
  className="rounded bg-red-600 px-3 py-1 text-sm hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
>
  Remove Selected Node
</button>
```

- [ ] **Step 2: Run tests**

```bash
cd /Users/nick/Developer/cass-visualize/web
npm run test
```

Expected: PASS all tests.

- [ ] **Step 3: Commit**

```bash
cd /Users/nick/Developer/cass-visualize
git add web/src/components/ControlPanel.tsx
git commit -m "feat: add remove selected node control"
```

---

### Task 13: Full test suite and dev server verification

**Files:**
- Modify: none
- Test: all tests + manual dev server

**Interfaces:**
- Consumes: everything built so far.
- Produces: verified working application.

- [ ] **Step 1: Run the full test suite**

```bash
cd /Users/nick/Developer/cass-visualize/web
npm run test
```

Expected: All tests pass.

- [ ] **Step 2: Type-check the project**

```bash
cd /Users/nick/Developer/cass-visualize/web
npx tsc --noEmit
```

Expected: No TypeScript errors.

- [ ] **Step 3: Start the dev server and smoke-test in browser**

```bash
cd /Users/nick/Developer/cass-visualize/web
npm run dev
```

Open the printed local URL in a browser. Verify:

1. Token ring renders with 3 colored arcs.
2. "Add Node" increases node count and updates the ring.
3. Changing the RF slider updates replica placement (visible in DetailsPanel counts in future enhancements; for v1, check event log).
4. Clicking a node selects it and shows details.
5. "Remove Selected Node" removes the node.
6. "Rebalance Tokens" rearranges the ring evenly.

Stop the dev server with `Ctrl+C` when done.

- [ ] **Step 4: Commit**

```bash
cd /Users/nick/Developer/cass-visualize
git add .
git commit -m "chore: verify full test suite and dev server"
```

---

## Self-Review

### Spec coverage

| Spec Section | Implementing Task |
|--------------|-------------------|
| 5.1 Cluster model | Task 2 |
| 5.2 Node | Task 2 |
| 5.3 Keyspace | Task 2 |
| 5.4 Replica placement | Task 3 |
| 5.5 Cluster Event | Task 2 + Task 4 |
| 6.1 Control Panel | Task 8 + Task 12 |
| 6.2 Token Ring Renderer | Task 6 + Task 7 |
| 6.3 Details Panel | Task 9 |
| 6.4 Event Log | Task 10 |
| 7 Key interactions | Task 4 + Task 8 + Task 11 |
| 8 Error handling | Task 4 reducer tests |
| 9 Tech stack | Task 1 |
| 10 Testing | Tasks 2–13 |
| 12 Success criteria | Task 13 |

### Placeholder scan

No TBD, TODO, "implement later", or vague steps found. Every step contains exact code, commands, and expected output.

### Type consistency

- `Cluster`, `Node`, `Keyspace`, `ClusterEvent`, `TokenRange` types are defined in Task 2 and consumed consistently.
- `ClusterAction` union is defined in Task 4 and used by `useCluster` and all control components.
- `getReplicaNodeIds`, `getNodeOwnedRanges`, `getRingArcs`, `getRingDimensions` signatures match across tasks.
