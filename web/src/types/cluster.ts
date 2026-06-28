export type NodeStatus = "up" | "leaving" | "down";

export interface StoredRow {
  partitionKey: string;
  value: string;
  timestamp: number;
  isTombstone?: boolean;
  ttl?: number;
  expiresAt?: number;
}

export interface SSTable {
  id: string;
  rows: StoredRow[];
  createdAt: number;
  level: number;
}

export interface NodeStorage {
  commitLog: StoredRow[];
  memtable: StoredRow[];
  sstables: SSTable[];
}

export interface Node {
  id: string;
  name: string;
  tokens: number[];
  status: NodeStatus;
  color: string;
  storage: NodeStorage;
}

export type CompactionStrategy = "STCS" | "LCS";

export interface Keyspace {
  id: string;
  name: string;
  replicationFactor: number;
  compactionStrategy: CompactionStrategy;
}

export interface ClusterEvent {
  id: string;
  timestamp: number;
  message: string;
}

export interface ClusterAnimation {
  writeTargetNodeId: string | null;
  flushedNodeId: string | null;
  joiningNodeId: string | null;
  compactedNodeId: string | null;
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
  activeTab: "topology" | "storage" | "compaction" | "knowledge";
  animation: ClusterAnimation;
}

export interface TokenRange {
  start: number;
  end: number;
  ownerId: string;
}
