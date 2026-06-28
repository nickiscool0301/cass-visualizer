import { describe, it, expect } from "vitest";
import type { Cluster, Node, Keyspace } from "../src/types/cluster";
import { emptyStorage } from "./fixtures";

describe("type smoke test", () => {
  it("accepts a minimal cluster", () => {
    const node: Node = {
      id: "n1",
      name: "node-1",
      tokens: [500],
      status: "up",
      color: "#ff0000",
      storage: emptyStorage(),
    };
    const ks: Keyspace = {
      id: "ks1",
      name: "system",
      replicationFactor: 1,
      compactionStrategy: "STCS",
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
      activeTab: "topology",
      animation: { writeTargetNodeId: null, flushedNodeId: null, joiningNodeId: null, compactedNodeId: null, lastWriteAction: null },
      gcGraceSeconds: 10,
    };
    expect(cluster.nodes).toHaveLength(1);
  });
});
