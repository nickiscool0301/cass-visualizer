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

function nextNodeName(nodes: Node[]): string {
  const numbers = nodes.map((n) => {
    const match = /^node-(\d+)$/.exec(n.name);
    return match ? Number(match[1]) : 0;
  });
  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
  return `node-${maxNumber + 1}`;
}

function allocateColor(nodes: Node[]): string {
  const used = new Set(nodes.map((n) => n.color));
  for (const color of palette) {
    if (!used.has(color)) {
      return color;
    }
  }
  // All palette colors are in use; fall back to a deterministic rotation.
  return palette[nodes.length % palette.length];
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
        name: nextNodeName(state.nodes),
        tokens: newTokens,
        status: "up",
        color: allocateColor(state.nodes),
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
