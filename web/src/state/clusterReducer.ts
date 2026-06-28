import type {
  Cluster,
  ClusterEvent,
  CompactionStrategy,
  Keyspace,
  Node,
  NodeStorage,
  SSTable,
  StoredRow,
} from "../types/cluster";
import { getAllTokenPoints, getReplicaNodeIds } from "../lib/replicaPlacement";

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

function createEmptyStorage(): NodeStorage {
  return { commitLog: [], memtable: [], sstables: [] };
}

function rangeSize(start: number, end: number, tokenRange: [number, number]): number {
  const span = tokenRange[1] - tokenRange[0] + 1;
  let size = end - start + 1;
  if (size <= 0) size += span;
  return size;
}

function splitLargestRange(
  nodes: Node[],
  tokenRange: [number, number]
): { ownerId: string; newToken: number } | null {
  if (nodes.length === 0) return null;
  const sorted = getAllTokenPoints(nodes);
  if (sorted.length === 0) return null;

  let largestStart = sorted[sorted.length - 1].token;
  let largestEnd = sorted[0].token;
  let largestSize = rangeSize(largestStart, largestEnd, tokenRange);
  let largestOwner = sorted[0].nodeId;

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const next = sorted[(i + 1) % sorted.length];
    const start = current.token;
    const end = next.token;
    const size = rangeSize(start, end, tokenRange);
    if (size > largestSize) {
      largestSize = size;
      largestStart = start;
      largestEnd = end;
      largestOwner = next.nodeId;
    }
  }

  const span = tokenRange[1] - tokenRange[0] + 1;
  let mid = largestStart + Math.floor(largestSize / 2);
  if (mid > tokenRange[1]) mid -= span;
  return { ownerId: largestOwner, newToken: mid };
}

function hashPartitionKey(key: string, tokenRange: [number, number]): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const [min, max] = tokenRange;
  const span = max - min + 1;
  return min + (Math.abs(hash) % span);
}

function flushMemtable(storage: NodeStorage): NodeStorage {
  if (storage.memtable.length === 0) return storage;
  const sortedRows = [...storage.memtable].sort((a, b) =>
    a.partitionKey.localeCompare(b.partitionKey)
  );
  const newSstable: SSTable = {
    id: generateId("sstable"),
    rows: sortedRows,
    createdAt: now(),
    level: 0,
  };
  return {
    commitLog: [],
    memtable: [],
    sstables: [newSstable, ...storage.sstables],
  };
}

function writeToNode(
  storage: NodeStorage,
  partitionKey: string,
  value: string
): NodeStorage {
  const row: StoredRow = { partitionKey, value, timestamp: now() };
  const nextCommitLog = [row, ...storage.commitLog];
  const nextMemtable = [row, ...storage.memtable];
  const needsFlush = nextMemtable.length >= 5;
  if (needsFlush) {
    const flushed = flushMemtable({ ...storage, commitLog: nextCommitLog, memtable: nextMemtable });
    return flushed;
  }
  return { ...storage, commitLog: nextCommitLog, memtable: nextMemtable };
}

function mergeRows(rows: StoredRow[]): StoredRow[] {
  const byKey = new Map<string, StoredRow>();
  for (const row of rows) {
    const existing = byKey.get(row.partitionKey);
    if (!existing || row.timestamp > existing.timestamp) {
      byKey.set(row.partitionKey, row);
    }
  }
  return Array.from(byKey.values()).sort((a, b) =>
    a.partitionKey.localeCompare(b.partitionKey)
  );
}

function compactSTCS(sstables: SSTable[]): { sstables: SSTable[]; compacted: boolean } {
  const byLevel = new Map<number, SSTable[]>();
  for (const sstable of sstables) {
    const list = byLevel.get(sstable.level) ?? [];
    list.push(sstable);
    byLevel.set(sstable.level, list);
  }

  for (const [level, list] of byLevel.entries()) {
    if (list.length >= 4) {
      const toCompact = list.slice(0, 4);
      const remaining = sstables.filter((s) => !toCompact.includes(s));
      const mergedRows = mergeRows(toCompact.flatMap((s) => s.rows));
      const newSstable: SSTable = {
        id: generateId("sstable"),
        rows: mergedRows,
        createdAt: now(),
        level: level + 1,
      };
      return { sstables: [newSstable, ...remaining], compacted: true };
    }
  }

  return { sstables, compacted: false };
}

function compactLCS(sstables: SSTable[]): { sstables: SSTable[]; compacted: boolean } {
  const byLevel = new Map<number, SSTable[]>();
  for (const sstable of sstables) {
    const list = byLevel.get(sstable.level) ?? [];
    list.push(sstable);
    byLevel.set(sstable.level, list);
  }

  for (let level = 0; ; level++) {
    const list = byLevel.get(level) ?? [];
    const limit = level === 0 ? 4 : 2;
    if (list.length > limit) {
      const remaining = sstables.filter((s) => !list.includes(s));
      const mergedRows = mergeRows(list.flatMap((s) => s.rows));
      const newSstable: SSTable = {
        id: generateId("sstable"),
        rows: mergedRows,
        createdAt: now(),
        level: level + 1,
      };
      return { sstables: [newSstable, ...remaining], compacted: true };
    }
    if (!byLevel.has(level)) break;
  }

  return { sstables, compacted: false };
}

function compactNode(storage: NodeStorage, strategy: CompactionStrategy): NodeStorage {
  if (strategy === "LCS") {
    const result = compactLCS(storage.sstables);
    return { ...storage, sstables: result.sstables };
  }
  const result = compactSTCS(storage.sstables);
  return { ...storage, sstables: result.sstables };
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
    storage: createEmptyStorage(),
  }));
  const keyspace: Keyspace = {
    id: generateId("ks"),
    name: "demo",
    replicationFactor: 1,
    compactionStrategy: "STCS",
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
    activeTab: "topology",
    animation: { writeTargetNodeId: null, flushedNodeId: null, joiningNodeId: null },
  };
}

export type ClusterAction =
  | { type: "ADD_NODE" }
  | { type: "REMOVE_NODE"; nodeId: string }
  | { type: "ADD_KEYSPACE"; name: string; replicationFactor: number; compactionStrategy?: CompactionStrategy }
  | { type: "SET_REPLICATION_FACTOR"; keyspaceId: string; replicationFactor: number }
  | { type: "SET_COMPACTION_STRATEGY"; keyspaceId: string; strategy: CompactionStrategy }
  | { type: "COMPACT"; nodeId: string }
  | { type: "REBALANCE_TOKENS" }
  | { type: "RESET_CLUSTER" }
  | { type: "SELECT_NODE"; nodeId: string | null }
  | { type: "SET_ACTIVE_KEYSPACE"; keyspaceId: string }
  | { type: "SET_ACTIVE_TAB"; tab: "topology" | "storage" | "compaction" }
  | { type: "WRITE"; partitionKey: string; value: string }
  | { type: "FLUSH_MEMTABLE"; nodeId: string }
  | { type: "CLEAR_ANIMATION" };

export function clusterReducer(state: Cluster, action: ClusterAction): Cluster {
  switch (action.type) {
    case "ADD_NODE": {
      const split = splitLargestRange(state.nodes, state.tokenRange);
      const newTokens = split ? [split.newToken] : [Math.floor(Math.random() * 1000)];
      const newNode: Node = {
        id: generateId("node"),
        name: nextNodeName(state.nodes),
        tokens: newTokens,
        status: "up",
        color: allocateColor(state.nodes),
        storage: createEmptyStorage(),
      };
      return {
        ...state,
        nodes: [...state.nodes, newNode],
        selectedNodeId: newNode.id,
        events: addEvent(
          state.events,
          split
            ? `Node ${newNode.name} added; streaming data from ${state.nodes.find((n) => n.id === split.ownerId)?.name ?? "owner"}`
            : `Node ${newNode.name} added`
        ),
        animation: { ...state.animation, joiningNodeId: newNode.id },
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
        compactionStrategy: action.compactionStrategy ?? "STCS",
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

    case "SET_COMPACTION_STRATEGY": {
      const keyspaces = state.keyspaces.map((k) =>
        k.id === action.keyspaceId ? { ...k, compactionStrategy: action.strategy } : k
      );
      const changed = keyspaces.find((k) => k.id === action.keyspaceId);
      return {
        ...state,
        keyspaces,
        events: addEvent(
          state.events,
          `Compaction strategy for ${changed?.name ?? action.keyspaceId} set to ${action.strategy}`
        ),
      };
    }

    case "COMPACT": {
      const activeKeyspace = state.keyspaces.find((k) => k.id === state.activeKeyspaceId);
      const strategy = activeKeyspace?.compactionStrategy ?? "STCS";
      const target = state.nodes.find((n) => n.id === action.nodeId);
      if (!target) return state;
      const prevCount = target.storage.sstables.length;
      const nodes = state.nodes.map((node) =>
        node.id === action.nodeId
          ? { ...node, storage: compactNode(node.storage, strategy) }
          : node
      );
      const updated = nodes.find((n) => n.id === action.nodeId)!;
      const newCount = updated.storage.sstables.length;
      return {
        ...state,
        nodes,
        events: addEvent(
          state.events,
          `Compacted ${target.name} (${strategy}): ${prevCount} → ${newCount} SSTables`
        ),
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

    case "SET_ACTIVE_TAB": {
      return { ...state, activeTab: action.tab };
    }

    case "WRITE": {
      const token = hashPartitionKey(action.partitionKey, state.tokenRange);
      const activeKeyspace = state.keyspaces.find((k) => k.id === state.activeKeyspaceId);
      const rf = activeKeyspace?.replicationFactor ?? 1;
      const replicaIds = getReplicaNodeIds(token, rf, state.nodes);
      if (replicaIds.length === 0) {
        return {
          ...state,
          events: addEvent(state.events, "No replicas available for write"),
        };
      }
      const nodes = state.nodes.map((node) => {
        if (!replicaIds.includes(node.id)) return node;
        return {
          ...node,
          storage: writeToNode(node.storage, action.partitionKey, action.value),
        };
      });
      const flushed = nodes.some(
        (n) =>
          replicaIds.includes(n.id) &&
          state.nodes.find((prev) => prev.id === n.id)!.storage.memtable.length >= 4 &&
          n.storage.memtable.length === 0
      );
      const message = flushed
        ? `Write to ${replicaIds.length} replica(s); memtable flushed to SSTable`
        : `Write to ${replicaIds.length} replica(s) at token ${token}`;
      return {
        ...state,
        nodes,
        events: addEvent(state.events, message),
        animation: { ...state.animation, writeTargetNodeId: replicaIds[0] ?? null, flushedNodeId: flushed ? replicaIds[0] ?? null : null },
      };
    }

    case "FLUSH_MEMTABLE": {
      const target = state.nodes.find((n) => n.id === action.nodeId);
      if (!target) return state;
      const nodes = state.nodes.map((node) =>
        node.id === action.nodeId
          ? { ...node, storage: flushMemtable(node.storage) }
          : node
      );
      return {
        ...state,
        nodes,
        events: addEvent(state.events, `Memtable flushed on ${target.name}`),
        animation: { ...state.animation, flushedNodeId: target.id },
      };
    }

    case "CLEAR_ANIMATION": {
      return { ...state, animation: { writeTargetNodeId: null, flushedNodeId: null, joiningNodeId: null } };
    }

    default:
      return state;
  }
}
