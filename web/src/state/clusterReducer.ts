import type {
  Cluster,
  ClusterEvent,
  CompactionStrategy,
  Hint,
  Keyspace,
  MerkleNode,
  Node,
  NodeStatus,
  NodeStorage,
  SSTable,
  StoredRow,
} from "../types/cluster";
import { buildMerkleTree, collectLeafRanges, findLeafForRange, hashPartitionKey, REPAIR_MERKLE_DEPTH } from "../lib/merkleTree";
import { getAllTokenPoints, getConsistentReplicaSetForRange, getReplicaNodeIds } from "../lib/replicaPlacement";
import { accept, createPaxosState, prepare, promise, accepted as paxosAccepted } from "../lib/paxos";

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
  return { commitLog: [], memtable: [], sstables: [], hints: [], paxosProposals: {} };
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
    ...storage,
    commitLog: [],
    memtable: [],
    sstables: [newSstable, ...storage.sstables],
  };
}

function writeToNode(
  storage: NodeStorage,
  partitionKey: string,
  value: string,
  ttlSeconds?: number,
  timestamp?: number
): NodeStorage {
  const rowTimestamp = timestamp ?? now();
  const row: StoredRow = { partitionKey, value, timestamp: rowTimestamp };
  if (ttlSeconds !== undefined) {
    row.ttl = ttlSeconds;
    row.expiresAt = rowTimestamp + ttlSeconds * 1000;
  }
  const nextCommitLog = [row, ...storage.commitLog];
  const nextMemtable = [row, ...storage.memtable];
  const needsFlush = nextMemtable.length >= 5;
  if (needsFlush) {
    const flushed = flushMemtable({ ...storage, commitLog: nextCommitLog, memtable: nextMemtable });
    return flushed;
  }
  return { ...storage, commitLog: nextCommitLog, memtable: nextMemtable };
}

function deleteToNode(storage: NodeStorage, partitionKey: string, timestamp?: number): NodeStorage {
  const row: StoredRow = {
    partitionKey,
    value: "[TOMBSTONE]",
    timestamp: timestamp ?? now(),
    isTombstone: true,
  };
  const nextCommitLog = [row, ...storage.commitLog];
  const nextMemtable = [row, ...storage.memtable];
  const needsFlush = nextMemtable.length >= 5;
  if (needsFlush) {
    const flushed = flushMemtable({ ...storage, commitLog: nextCommitLog, memtable: nextMemtable });
    return flushed;
  }
  return { ...storage, commitLog: nextCommitLog, memtable: nextMemtable };
}

function writeRowToNode(storage: NodeStorage, row: StoredRow): NodeStorage {
  const nextCommitLog = [row, ...storage.commitLog];
  const nextMemtable = [row, ...storage.memtable];
  const needsFlush = nextMemtable.length >= 5;
  if (needsFlush) {
    return flushMemtable({ ...storage, commitLog: nextCommitLog, memtable: nextMemtable });
  }
  return { ...storage, commitLog: nextCommitLog, memtable: nextMemtable };
}

function replayHintsForNode(
  nodes: Node[],
  targetNodeId: string
): { nodes: Node[]; replayCount: number } {
  const rowsToReplay: StoredRow[] = [];
  const nextNodes = nodes.map((node) => {
    const remaining: Hint[] = [];
    for (const hint of node.storage.hints) {
      if (hint.targetNodeId === targetNodeId) {
        rowsToReplay.push({
          partitionKey: hint.partitionKey,
          value: hint.value,
          timestamp: hint.timestamp,
          isTombstone: hint.isTombstone,
        });
      } else {
        remaining.push(hint);
      }
    }
    if (remaining.length !== node.storage.hints.length) {
      return { ...node, storage: { ...node.storage, hints: remaining } };
    }
    return node;
  });

  if (rowsToReplay.length === 0) {
    return { nodes: nextNodes, replayCount: 0 };
  }

  const finalNodes = nextNodes.map((node) => {
    if (node.id !== targetNodeId) return node;
    let storage = node.storage;
    for (const row of rowsToReplay) {
      storage = writeRowToNode(storage, row);
    }
    return { ...node, storage };
  });

  return { nodes: finalNodes, replayCount: rowsToReplay.length };
}

function isBetterRow(candidate: StoredRow, current: StoredRow): boolean {
  if (candidate.timestamp > current.timestamp) return true;
  if (candidate.timestamp < current.timestamp) return false;
  if (candidate.isTombstone && !current.isTombstone) return true;
  if (!candidate.isTombstone && current.isTombstone) return false;
  return candidate.value > current.value;
}

function findLatestRow(storage: NodeStorage, partitionKey: string): StoredRow | undefined {
  const allRows = [...storage.memtable, ...storage.sstables.flatMap((s) => s.rows)];
  const matches = allRows.filter((r) => r.partitionKey === partitionKey);
  if (matches.length === 0) return undefined;
  return matches.reduce((latest, row) => (isBetterRow(row, latest) ? row : latest));
}

function digestEqual(a: StoredRow | undefined, b: StoredRow | undefined): boolean {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;
  return a.value === b.value && a.timestamp === b.timestamp && !!a.isTombstone === !!b.isTombstone;
}

function getPaxosState(storage: NodeStorage, partitionKey: string) {
  return storage.paxosProposals[partitionKey] ?? createPaxosState();
}

function setPaxosState(storage: NodeStorage, partitionKey: string, paxosState: import("../types/cluster").PaxosState): NodeStorage {
  return {
    ...storage,
    paxosProposals: { ...storage.paxosProposals, [partitionKey]: paxosState },
  };
}

function runPaxosPropose(
  state: Cluster,
  partitionKey: string,
  value: string,
  ballotOverride?: number
): {
  state: Cluster;
  committed: boolean;
  winningValue: string;
  coordinatorId: string;
} {
  const token = hashPartitionKey(partitionKey, state.tokenRange);
  const activeKeyspace = state.keyspaces.find((k) => k.id === state.activeKeyspaceId);
  const rf = activeKeyspace?.replicationFactor ?? 1;
  const replicaIds = getReplicaNodeIds(token, rf, state.nodes);
  const liveReplicaIds = replicaIds.filter((id) => state.nodes.find((n) => n.id === id)!.status === "up");
  const coordinatorId = liveReplicaIds[0] ?? state.nodes.find((n) => n.status === "up")?.id ?? "";
  const ballot = ballotOverride ?? now();

  // Phase 1: Prepare
  let nodesAfterPrepare = state.nodes.map((node) => {
    if (!liveReplicaIds.includes(node.id)) return node;
    const ps = getPaxosState(node.storage, partitionKey);
    const result = prepare(ps, ballot);
    if (!result.ok) return node;
    return { ...node, storage: setPaxosState(node.storage, partitionKey, promise(ps, ballot)) };
  });

  const promises = nodesAfterPrepare.filter((n) => {
    if (!liveReplicaIds.includes(n.id)) return false;
    const ps = getPaxosState(n.storage, partitionKey);
    return ps.promisedBallot >= ballot;
  }).length;
  const majority = Math.floor(liveReplicaIds.length / 2) + 1;

  if (promises < majority) {
    return { state: { ...state, nodes: nodesAfterPrepare }, committed: false, winningValue: value, coordinatorId };
  }

  // Phase 2: Choose value (use the value with the highest accepted ballot, if any)
  let proposedValue = value;
  let highestAcceptedBallot = -1;
  for (const node of nodesAfterPrepare) {
    if (!liveReplicaIds.includes(node.id)) continue;
    const ps = getPaxosState(node.storage, partitionKey);
    if (ps.acceptedValue !== null && ps.acceptedBallot !== null && ps.acceptedBallot > highestAcceptedBallot) {
      highestAcceptedBallot = ps.acceptedBallot;
      proposedValue = ps.acceptedValue;
    }
  }

  // Phase 3: Accept
  let nodesAfterAccept = nodesAfterPrepare.map((node) => {
    if (!liveReplicaIds.includes(node.id)) return node;
    const ps = getPaxosState(node.storage, partitionKey);
    if (!accept(ps, ballot, proposedValue)) return node;
    return { ...node, storage: setPaxosState(node.storage, partitionKey, paxosAccepted(ps, ballot, proposedValue)) };
  });

  const accepts = nodesAfterAccept.filter((n) => {
    if (!liveReplicaIds.includes(n.id)) return false;
    const ps = getPaxosState(n.storage, partitionKey);
    return ps.acceptedBallot === ballot && ps.acceptedValue === proposedValue;
  }).length;

  if (accepts < majority) {
    return { state: { ...state, nodes: nodesAfterAccept }, committed: false, winningValue: proposedValue, coordinatorId };
  }

  // Phase 4: Commit
  const timestamp = now();
  const committedNodes = nodesAfterAccept.map((node) => {
    if (!liveReplicaIds.includes(node.id)) return node;
    const row: StoredRow = { partitionKey, value: proposedValue, timestamp };
    const storage = writeRowToNode(node.storage, row);
    return { ...node, storage };
  });

  return {
    state: { ...state, nodes: committedNodes },
    committed: true,
    winningValue: proposedValue,
    coordinatorId,
  };
}

function expireTTLRows(storage: NodeStorage, currentTime: number): NodeStorage {
  let changed = false;
  const nextMemtable = storage.memtable.map((row) => {
    if (row.expiresAt !== undefined && row.expiresAt <= currentTime && !row.isTombstone) {
      changed = true;
      return { ...row, isTombstone: true, value: "[TOMBSTONE]", timestamp: currentTime };
    }
    return row;
  });
  return changed ? { ...storage, memtable: nextMemtable } : storage;
}

function getRowsInRange(
  rows: StoredRow[],
  range: [number, number],
  tokenRange: [number, number]
): StoredRow[] {
  const [start, end] = range;
  return rows.filter((r) => {
    const token = hashPartitionKey(r.partitionKey, tokenRange);
    return token >= start && token <= end;
  });
}

export function mergeRows(rows: StoredRow[], gcGraceSeconds: number): StoredRow[] {
  const byKey = new Map<string, StoredRow>();
  for (const row of rows) {
    const existing = byKey.get(row.partitionKey);
    if (!existing || isBetterRow(row, existing)) {
      byKey.set(row.partitionKey, row);
    }
  }
  const gcGraceMs = gcGraceSeconds * 1000;
  const currentTime = now();
  return Array.from(byKey.values())
    .filter((row) => !(row.isTombstone && currentTime - row.timestamp > gcGraceMs))
    .sort((a, b) => a.partitionKey.localeCompare(b.partitionKey));
}

function compactSTCS(
  sstables: SSTable[],
  gcGraceSeconds: number
): { sstables: SSTable[]; compacted: boolean } {
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
      const mergedRows = mergeRows(toCompact.flatMap((s) => s.rows), gcGraceSeconds);
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

function compactLCS(
  sstables: SSTable[],
  gcGraceSeconds: number
): { sstables: SSTable[]; compacted: boolean } {
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
      const mergedRows = mergeRows(list.flatMap((s) => s.rows), gcGraceSeconds);
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

function compactNode(
  storage: NodeStorage,
  strategy: CompactionStrategy,
  gcGraceSeconds: number
): NodeStorage {
  if (strategy === "LCS") {
    const result = compactLCS(storage.sstables, gcGraceSeconds);
    return { ...storage, sstables: result.sstables };
  }
  const result = compactSTCS(storage.sstables, gcGraceSeconds);
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
    animation: { writeTargetNodeId: null, flushedNodeId: null, joiningNodeId: null, compactedNodeId: null, repairingNodeId: null, lastWriteAction: null, readCoordinatorNodeId: null, readRepairTargetNodeIds: [], paxosPhase: null, paxosCoordinatorNodeId: null },
    lastReadResult: null,
    gcGraceSeconds: 10,
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
  | { type: "SET_ACTIVE_TAB"; tab: "topology" | "storage" | "compaction" | "repair" | "lwt" | "knowledge" }
  | { type: "WRITE"; partitionKey: string; value: string }
  | { type: "WRITE_TO_NODE"; nodeId: string; partitionKey: string; value: string }
  | { type: "WRITE_TTL"; partitionKey: string; value: string; ttlSeconds: number }
  | { type: "DELETE"; partitionKey: string }
  | { type: "TICK_TTL" }
  | { type: "SET_GC_GRACE_SECONDS"; seconds: number }
  | { type: "FLUSH_MEMTABLE"; nodeId: string }
  | { type: "RUN_REPAIR" }
  | { type: "READ"; partitionKey: string }
  | { type: "EXECUTE_READ_REPAIR"; partitionKey: string }
  | { type: "CLEAR_ANIMATION" }
  | { type: "TOGGLE_NODE_STATUS"; nodeId: string }
  | { type: "BRING_NODE_ONLINE"; nodeId: string }
  | { type: "SEND_HINTS"; nodeId: string }
  | { type: "LWT_PROPOSE"; partitionKey: string; value: string }
  | { type: "LWT_COMMIT"; partitionKey: string; value: string; ballot: number }
  | { type: "LWT_CONTEND"; partitionKey: string; valueA: string; valueB: string };

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
          ? { ...node, storage: compactNode(node.storage, strategy, state.gcGraceSeconds) }
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
        animation: { ...state.animation, compactedNodeId: target.id },
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
      const liveReplicaIds = replicaIds.filter((id) => state.nodes.find((n) => n.id === id)!.status === "up");
      const downReplicaIds = replicaIds.filter((id) => !liveReplicaIds.includes(id));
      const coordinatorId = liveReplicaIds[0] ?? state.nodes.find((n) => n.status === "up")?.id;
      if (!coordinatorId) {
        return { ...state, events: addEvent(state.events, "No live coordinator available for write") };
      }
      const timestamp = now();
      const hints: Hint[] = downReplicaIds.map((targetId) => ({
        id: generateId("hint"),
        targetNodeId: targetId,
        partitionKey: action.partitionKey,
        value: action.value,
        timestamp,
        isTombstone: false,
      }));
      const nodes = state.nodes.map((node) => {
        let storage = node.storage;
        if (liveReplicaIds.includes(node.id)) {
          storage = writeToNode(storage, action.partitionKey, action.value, undefined, timestamp);
        }
        if (node.id === coordinatorId) {
          storage = { ...storage, hints: [...storage.hints, ...hints] };
        }
        return { ...node, storage };
      });
      const flushed = nodes.some(
        (n) =>
          liveReplicaIds.includes(n.id) &&
          state.nodes.find((prev) => prev.id === n.id)!.storage.memtable.length >= 4 &&
          n.storage.memtable.length === 0
      );
      const message = flushed
        ? `Write to ${replicaIds.length} replica(s); memtable flushed to SSTable`
        : `Write to ${replicaIds.length} replica(s) at token ${token}`;
      let events = addEvent(state.events, message);
      for (let i = downReplicaIds.length - 1; i >= 0; i--) {
        const downNode = state.nodes.find((n) => n.id === downReplicaIds[i])!;
        events = addEvent(events, `Stored hint for ${downNode.name}`);
      }
      return {
        ...state,
        nodes,
        events,
        animation: { ...state.animation, writeTargetNodeId: coordinatorId, flushedNodeId: flushed ? coordinatorId : null, lastWriteAction: "write" },
      };
    }

    case "WRITE_TO_NODE": {
      const target = state.nodes.find((n) => n.id === action.nodeId);
      if (!target) return state;
      const nodes = state.nodes.map((node) =>
        node.id === action.nodeId
          ? { ...node, storage: writeToNode(node.storage, action.partitionKey, action.value) }
          : node
      );
      return {
        ...state,
        nodes,
        events: addEvent(state.events, `Wrote ${action.partitionKey}=${action.value} to ${target.name} only`),
        animation: { ...state.animation, writeTargetNodeId: target.id, lastWriteAction: "write" },
      };
    }

    case "WRITE_TTL": {
      const token = hashPartitionKey(action.partitionKey, state.tokenRange);
      const activeKeyspace = state.keyspaces.find((k) => k.id === state.activeKeyspaceId);
      const rf = activeKeyspace?.replicationFactor ?? 1;
      const replicaIds = getReplicaNodeIds(token, rf, state.nodes);
      if (replicaIds.length === 0) {
        return {
          ...state,
          events: addEvent(state.events, "No replicas available for TTL write"),
        };
      }
      const liveReplicaIds = replicaIds.filter((id) => state.nodes.find((n) => n.id === id)!.status === "up");
      const downReplicaIds = replicaIds.filter((id) => !liveReplicaIds.includes(id));
      const coordinatorId = liveReplicaIds[0] ?? state.nodes.find((n) => n.status === "up")?.id;
      if (!coordinatorId) {
        return { ...state, events: addEvent(state.events, "No live coordinator available for TTL write") };
      }
      const timestamp = now();
      const hints: Hint[] = downReplicaIds.map((targetId) => ({
        id: generateId("hint"),
        targetNodeId: targetId,
        partitionKey: action.partitionKey,
        value: action.value,
        timestamp,
        isTombstone: false,
      }));
      const nodes = state.nodes.map((node) => {
        let storage = node.storage;
        if (liveReplicaIds.includes(node.id)) {
          storage = writeToNode(storage, action.partitionKey, action.value, action.ttlSeconds, timestamp);
        }
        if (node.id === coordinatorId) {
          storage = { ...storage, hints: [...storage.hints, ...hints] };
        }
        return { ...node, storage };
      });
      const flushed = nodes.some(
        (n) =>
          liveReplicaIds.includes(n.id) &&
          state.nodes.find((prev) => prev.id === n.id)!.storage.memtable.length >= 4 &&
          n.storage.memtable.length === 0
      );
      const message = flushed
        ? `Wrote ${action.partitionKey} with TTL ${action.ttlSeconds}s on ${replicaIds.length} replica(s); memtable flushed`
        : `Wrote ${action.partitionKey} with TTL ${action.ttlSeconds}s on ${replicaIds.length} replica(s)`;
      let events = addEvent(state.events, message);
      for (let i = downReplicaIds.length - 1; i >= 0; i--) {
        const downNode = state.nodes.find((n) => n.id === downReplicaIds[i])!;
        events = addEvent(events, `Stored hint for ${downNode.name}`);
      }
      return {
        ...state,
        nodes,
        events,
        animation: { ...state.animation, writeTargetNodeId: coordinatorId, flushedNodeId: flushed ? coordinatorId : null, lastWriteAction: "write_ttl" },
      };
    }

    case "DELETE": {
      const token = hashPartitionKey(action.partitionKey, state.tokenRange);
      const activeKeyspace = state.keyspaces.find((k) => k.id === state.activeKeyspaceId);
      const rf = activeKeyspace?.replicationFactor ?? 1;
      const replicaIds = getReplicaNodeIds(token, rf, state.nodes);
      if (replicaIds.length === 0) {
        return {
          ...state,
          events: addEvent(state.events, "No replicas available for delete"),
        };
      }
      const liveReplicaIds = replicaIds.filter((id) => state.nodes.find((n) => n.id === id)!.status === "up");
      const downReplicaIds = replicaIds.filter((id) => !liveReplicaIds.includes(id));
      const coordinatorId = liveReplicaIds[0] ?? state.nodes.find((n) => n.status === "up")?.id;
      if (!coordinatorId) {
        return { ...state, events: addEvent(state.events, "No live coordinator available for delete") };
      }
      const timestamp = now();
      const hints: Hint[] = downReplicaIds.map((targetId) => ({
        id: generateId("hint"),
        targetNodeId: targetId,
        partitionKey: action.partitionKey,
        value: "[TOMBSTONE]",
        timestamp,
        isTombstone: true,
      }));
      const nodes = state.nodes.map((node) => {
        let storage = node.storage;
        if (liveReplicaIds.includes(node.id)) {
          storage = deleteToNode(storage, action.partitionKey, timestamp);
        }
        if (node.id === coordinatorId) {
          storage = { ...storage, hints: [...storage.hints, ...hints] };
        }
        return { ...node, storage };
      });
      const flushed = nodes.some(
        (n) =>
          liveReplicaIds.includes(n.id) &&
          state.nodes.find((prev) => prev.id === n.id)!.storage.memtable.length >= 4 &&
          n.storage.memtable.length === 0
      );
      const message = flushed
        ? `Deleted ${action.partitionKey} on ${replicaIds.length} replica(s); memtable flushed`
        : `Deleted ${action.partitionKey} on ${replicaIds.length} replica(s)`;
      let events = addEvent(state.events, message);
      for (let i = downReplicaIds.length - 1; i >= 0; i--) {
        const downNode = state.nodes.find((n) => n.id === downReplicaIds[i])!;
        events = addEvent(events, `Stored hint for ${downNode.name}`);
      }
      return {
        ...state,
        nodes,
        events,
        animation: { ...state.animation, writeTargetNodeId: coordinatorId, flushedNodeId: flushed ? coordinatorId : null, lastWriteAction: "delete" },
      };
    }

    case "TICK_TTL": {
      const currentTime = now();
      const expiredKeys: string[] = [];
      const nodes = state.nodes.map((node) => {
        const expired = node.storage.memtable.filter(
          (row) => row.expiresAt !== undefined && row.expiresAt <= currentTime && !row.isTombstone
        );
        if (expired.length === 0) return node;
        expiredKeys.push(...expired.map((row) => row.partitionKey));
        return { ...node, storage: expireTTLRows(node.storage, currentTime) };
      });
      if (expiredKeys.length === 0) return state;
      const uniqueKeys = Array.from(new Set(expiredKeys)).sort();
      return {
        ...state,
        nodes,
        events: addEvent(state.events, `TTL expired for ${uniqueKeys.join(", ")}`),
      };
    }

    case "SET_GC_GRACE_SECONDS": {
      return {
        ...state,
        gcGraceSeconds: action.seconds,
        events: addEvent(state.events, `gc_grace_seconds set to ${action.seconds}`),
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

    case "RUN_REPAIR": {
      const activeKeyspace = state.keyspaces.find((k) => k.id === state.activeKeyspaceId);
      const rf = activeKeyspace?.replicationFactor ?? 1;

      let events = addEvent(state.events, "Repair started");

      if (state.nodes.length < 2 || rf < 2) {
        return {
          ...state,
          events: addEvent(events, "Repair: no replica pairs to compare with current RF"),
        };
      }

      const trees = new Map<string, MerkleNode>();
      for (const node of state.nodes) {
        const allRows = [...node.storage.memtable, ...node.storage.sstables.flatMap((s) => s.rows)];
        const merged = mergeRows(allRows, state.gcGraceSeconds);
        trees.set(node.id, buildMerkleTree(merged, state.tokenRange, REPAIR_MERKLE_DEPTH));
      }

      const firstTree = trees.get(state.nodes[0].id);
      const leafRanges = firstTree ? collectLeafRanges(firstTree) : [];

      let mismatchCount = 0;
      const streamedCountByNode = new Map<string, number>();
      const nextNodes = state.nodes.map((node) => ({
        ...node,
        storage: { ...node.storage, memtable: [...node.storage.memtable] },
      }));

      for (const range of leafRanges) {
        const replicaIds = getConsistentReplicaSetForRange(range, rf, state.nodes, state.tokenRange);
        if (!replicaIds || replicaIds.length < 2) continue;

        const hashes = new Set(
          replicaIds.map((id) => {
            const leaf = findLeafForRange(trees.get(id)!, range);
            return leaf?.hash;
          })
        );
        if (hashes.size <= 1) continue;

        mismatchCount++;

        let allReplicaRows: StoredRow[] = [];
        for (const id of replicaIds) {
          const node = state.nodes.find((n) => n.id === id)!;
          const allRows = [...node.storage.memtable, ...node.storage.sstables.flatMap((s) => s.rows)];
          allReplicaRows.push(...getRowsInRange(allRows, range, state.tokenRange));
        }

        const authoritative = new Map(
          mergeRows(allReplicaRows, state.gcGraceSeconds).map((r) => [r.partitionKey, r])
        );

        for (const targetId of replicaIds) {
          const targetNode = nextNodes.find((n) => n.id === targetId)!;
          const targetRows = [...targetNode.storage.memtable, ...targetNode.storage.sstables.flatMap((s) => s.rows)];
          const targetByKey = new Map(
            mergeRows(getRowsInRange(targetRows, range, state.tokenRange), state.gcGraceSeconds).map((r) => [
              r.partitionKey,
              r,
            ])
          );

          let streamed = 0;
          for (const [key, authRow] of authoritative) {
            const targetRow = targetByKey.get(key);
            if (!targetRow || targetRow.value !== authRow.value) {
              targetNode.storage.memtable.push(authRow);
              streamed++;
            }
          }
          if (streamed > 0) {
            streamedCountByNode.set(targetId, (streamedCountByNode.get(targetId) ?? 0) + streamed);
          }
        }
      }

      events = addEvent(
        events,
        `Repair: ${mismatchCount} mismatching range${mismatchCount === 1 ? "" : "s"} found`
      );

      let repairingNodeId: string | null = null;
      for (const [nodeId, count] of streamedCountByNode) {
        const node = state.nodes.find((n) => n.id === nodeId)!;
        events = addEvent(
          events,
          `Repair: streamed ${count} row${count === 1 ? "" : "s"} to ${node.name}`
        );
        repairingNodeId = nodeId;
      }

      if (streamedCountByNode.size === 0) {
        events = addEvent(events, "Repair: no rows needed streaming");
      }

      return {
        ...state,
        nodes: nextNodes,
        events,
        animation: { ...state.animation, repairingNodeId },
      };
    }

    case "READ": {
      const token = hashPartitionKey(action.partitionKey, state.tokenRange);
      const activeKeyspace = state.keyspaces.find((k) => k.id === state.activeKeyspaceId);
      const rf = activeKeyspace?.replicationFactor ?? 1;
      const replicaIds = getReplicaNodeIds(token, rf, state.nodes);
      if (replicaIds.length === 0) {
        return {
          ...state,
          events: addEvent(state.events, "No replicas available for read"),
          lastReadResult: {
            partitionKey: action.partitionKey,
            coordinatorId: null,
            digestMismatches: [],
            resolvedValue: null,
          },
        };
      }
      const coordinatorId = replicaIds[0];
      const coordinator = state.nodes.find((n) => n.id === coordinatorId)!;
      const coordinatorRow = findLatestRow(coordinator.storage, action.partitionKey);
      const mismatches: string[] = [];
      for (const replicaId of replicaIds) {
        if (replicaId === coordinatorId) continue;
        const replica = state.nodes.find((n) => n.id === replicaId)!;
        const replicaRow = findLatestRow(replica.storage, action.partitionKey);
        if (!digestEqual(coordinatorRow, replicaRow)) {
          mismatches.push(replicaId);
        }
      }
      const matched = mismatches.length === 0;
      const returnedValue = coordinatorRow?.value ?? null;
      const eventMessage = matched
        ? `Read ${action.partitionKey}: digests matched`
        : `Read ${action.partitionKey}: digest mismatch detected`;
      return {
        ...state,
        events: addEvent(state.events, eventMessage),
        lastReadResult: {
          partitionKey: action.partitionKey,
          coordinatorId,
          digestMismatches: mismatches,
          resolvedValue: matched ? returnedValue : null,
        },
        animation: {
          ...state.animation,
          readCoordinatorNodeId: coordinatorId,
          readRepairTargetNodeIds: [],
        },
      };
    }

    case "EXECUTE_READ_REPAIR": {
      const token = hashPartitionKey(action.partitionKey, state.tokenRange);
      const activeKeyspace = state.keyspaces.find((k) => k.id === state.activeKeyspaceId);
      const rf = activeKeyspace?.replicationFactor ?? 1;
      const replicaIds = getReplicaNodeIds(token, rf, state.nodes);
      if (replicaIds.length === 0) {
        return {
          ...state,
          events: addEvent(state.events, "No replicas available for read repair"),
          lastReadResult: {
            partitionKey: action.partitionKey,
            coordinatorId: null,
            digestMismatches: [],
            resolvedValue: null,
          },
        };
      }
      const coordinatorId = replicaIds[0];
      let winner: StoredRow | undefined;
      for (const replicaId of replicaIds) {
        const replica = state.nodes.find((n) => n.id === replicaId)!;
        const row = findLatestRow(replica.storage, action.partitionKey);
        if (row && (!winner || row.timestamp > winner.timestamp)) {
          winner = row;
        }
      }
      if (!winner) {
        return {
          ...state,
          events: addEvent(
            state.events,
            `Read repair resolved ${action.partitionKey} -> (no data); no repair needed`
          ),
          lastReadResult: {
            partitionKey: action.partitionKey,
            coordinatorId,
            digestMismatches: [],
            resolvedValue: null,
          },
          animation: {
            ...state.animation,
            readCoordinatorNodeId: null,
            readRepairTargetNodeIds: [],
          },
        };
      }
      const repairedIds: string[] = [];
      const nodes = state.nodes.map((node) => {
        if (!replicaIds.includes(node.id)) return node;
        const currentRow = findLatestRow(node.storage, action.partitionKey);
        if (!digestEqual(currentRow, winner)) {
          repairedIds.push(node.id);
          return { ...node, storage: writeRowToNode(node.storage, winner) };
        }
        return node;
      });
      const repairedNames = repairedIds.map((id) => state.nodes.find((n) => n.id === id)?.name ?? id);
      const eventMessage =
        repairedIds.length === 0
          ? `Read ${action.partitionKey}: all replicas consistent`
          : `Read repair resolved ${action.partitionKey} -> ${winner.value}; repaired ${repairedNames.join(", ")}`;
      return {
        ...state,
        nodes,
        events: addEvent(state.events, eventMessage),
        lastReadResult: {
          partitionKey: action.partitionKey,
          coordinatorId,
          digestMismatches: [],
          resolvedValue: winner.value,
        },
        animation: {
          ...state.animation,
          readCoordinatorNodeId: null,
          readRepairTargetNodeIds: repairedIds,
        },
      };
    }

    case "CLEAR_ANIMATION": {
      return { ...state, animation: { writeTargetNodeId: null, flushedNodeId: null, joiningNodeId: null, compactedNodeId: null, repairingNodeId: null, lastWriteAction: null, readCoordinatorNodeId: null, readRepairTargetNodeIds: [], paxosPhase: null, paxosCoordinatorNodeId: null } };
    }

    case "LWT_PROPOSE": {
      const result = runPaxosPropose(state, action.partitionKey, action.value);
      const message = result.committed
        ? `LWT ${action.partitionKey}=${result.winningValue} committed`
        : `LWT ${action.partitionKey} rejected: no majority`;
      return {
        ...result.state,
        events: addEvent(result.state.events, message),
        animation: {
          ...result.state.animation,
          paxosPhase: result.committed ? "commit" : "prepare",
          paxosCoordinatorNodeId: result.coordinatorId,
        },
      };
    }

    case "LWT_COMMIT": {
      const token = hashPartitionKey(action.partitionKey, state.tokenRange);
      const activeKeyspace = state.keyspaces.find((k) => k.id === state.activeKeyspaceId);
      const rf = activeKeyspace?.replicationFactor ?? 1;
      const replicaIds = getReplicaNodeIds(token, rf, state.nodes);
      const nodes = state.nodes.map((node) => {
        if (!replicaIds.includes(node.id)) return node;
        const ps = getPaxosState(node.storage, action.partitionKey);
        if (ps.promisedBallot > action.ballot) return node;
        const row: StoredRow = { partitionKey: action.partitionKey, value: action.value, timestamp: now() };
        return { ...node, storage: writeRowToNode(node.storage, row) };
      });
      return {
        ...state,
        nodes,
        events: addEvent(state.events, `LWT ${action.partitionKey}=${action.value} committed (ballot ${action.ballot})`),
        animation: { ...state.animation, paxosPhase: "commit", paxosCoordinatorNodeId: replicaIds[0] ?? null },
      };
    }

    case "LWT_CONTEND": {
      const resultA = runPaxosPropose(state, action.partitionKey, action.valueA);
      if (!resultA.committed) {
        return {
          ...resultA.state,
          events: addEvent(resultA.state.events, `Contention on ${action.partitionKey}: client A could not commit`),
        };
      }
      const ballotB = now() + 1;
      const resultB = runPaxosPropose(resultA.state, action.partitionKey, action.valueB, ballotB);
      const winner = resultB.committed ? action.valueB : resultA.winningValue;
      const loser = resultB.committed ? action.valueA : action.valueB;
      return {
        ...resultB.state,
        events: addEvent(
          resultB.state.events,
          `Contention on ${action.partitionKey}: client ${resultB.committed ? "B" : "A"} won with ${winner}; client ${resultB.committed ? "A" : "B"} retried with ${loser}`
        ),
        animation: { ...resultB.state.animation, paxosPhase: "commit", paxosCoordinatorNodeId: resultB.coordinatorId },
      };
    }

    case "TOGGLE_NODE_STATUS": {
      const target = state.nodes.find((n) => n.id === action.nodeId);
      if (!target) return state;
      const nextStatus: NodeStatus = target.status === "up" ? "down" : "up";
      const nodes = state.nodes.map((n) =>
        n.id === action.nodeId ? { ...n, status: nextStatus } : n
      );
      return {
        ...state,
        nodes,
        events: addEvent(state.events, `${target.name} is now ${nextStatus}`),
      };
    }

    case "BRING_NODE_ONLINE": {
      const target = state.nodes.find((n) => n.id === action.nodeId);
      if (!target) return state;
      if (target.status === "up") {
        return {
          ...state,
          events: addEvent(state.events, `${target.name} is already online`),
        };
      }
      const upNodes = state.nodes.map((n) =>
        n.id === action.nodeId ? { ...n, status: "up" as NodeStatus } : n
      );
      let events = addEvent(state.events, `${target.name} came online`);
      const replayResult = replayHintsForNode(upNodes, action.nodeId);
      if (replayResult.replayCount > 0) {
        events = addEvent(
          events,
          `Replaying ${replayResult.replayCount} hint${replayResult.replayCount === 1 ? "" : "s"} to ${target.name}`
        );
      }
      return {
        ...state,
        nodes: replayResult.nodes,
        events,
        animation: { ...state.animation, writeTargetNodeId: action.nodeId },
      };
    }

    case "SEND_HINTS": {
      const target = state.nodes.find((n) => n.id === action.nodeId);
      if (!target) return state;
      const replayResult = replayHintsForNode(state.nodes, action.nodeId);
      let events = state.events;
      if (replayResult.replayCount > 0) {
        events = addEvent(
          events,
          `Replaying ${replayResult.replayCount} hint${replayResult.replayCount === 1 ? "" : "s"} to ${target.name}`
        );
      } else {
        events = addEvent(events, `No hints to replay for ${target.name}`);
      }
      return {
        ...state,
        nodes: replayResult.nodes,
        events,
        animation: { ...state.animation, writeTargetNodeId: action.nodeId },
      };
    }

    default:
      return state;
  }
}
