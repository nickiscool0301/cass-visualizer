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
