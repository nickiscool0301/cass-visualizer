import { describe, it, expect } from "vitest";
import { clusterReducer, createInitialCluster } from "../src/state/clusterReducer";

describe("clusterReducer repair actions", () => {
  it("WRITE_TO_NODE writes a row to a single node only", () => {
    const initial = createInitialCluster();
    const target = initial.nodes[1];
    const next = clusterReducer(initial, {
      type: "WRITE_TO_NODE",
      nodeId: target.id,
      partitionKey: "user-1",
      value: "alice",
    });

    const targetNode = next.nodes.find((n) => n.id === target.id)!;
    expect(targetNode.storage.memtable.some((r) => r.partitionKey === "user-1" && r.value === "alice")).toBe(true);

    const otherNodes = next.nodes.filter((n) => n.id !== target.id);
    for (const node of otherNodes) {
      const hasRow =
        node.storage.memtable.some((r) => r.partitionKey === "user-1") ||
        node.storage.sstables.some((s) => s.rows.some((r) => r.partitionKey === "user-1"));
      expect(hasRow).toBe(false);
    }

    expect(next.events[0].message).toMatch(/Wrote user-1=alice to node-\d+ only/);
    expect(next.animation.writeTargetNodeId).toBe(target.id);
  });

  it("WRITE_TO_NODE is a no-op for an unknown node", () => {
    const initial = createInitialCluster();
    const next = clusterReducer(initial, {
      type: "WRITE_TO_NODE",
      nodeId: "unknown",
      partitionKey: "user-1",
      value: "alice",
    });
    expect(next).toEqual(initial);
  });

  it("RUN_REPAIR detects drift and copies missing rows to stale replicas", () => {
    let state = createInitialCluster();
    const keyspace = state.keyspaces[0];

    // RF=3 so every node is a replica.
    state = clusterReducer(state, {
      type: "SET_REPLICATION_FACTOR",
      keyspaceId: keyspace.id,
      replicationFactor: 3,
    });

    // Create drift: write a row to only one node.
    const target = state.nodes[0];
    state = clusterReducer(state, {
      type: "WRITE_TO_NODE",
      nodeId: target.id,
      partitionKey: "user-1",
      value: "alice",
    });

    // Confirm only the target has the row.
    for (const node of state.nodes) {
      const hasRow = node.storage.memtable.some((r) => r.partitionKey === "user-1");
      expect(hasRow).toBe(node.id === target.id);
    }

    state = clusterReducer(state, { type: "RUN_REPAIR" });

    // All replicas should now have the row.
    for (const node of state.nodes) {
      const hasRow = node.storage.memtable.some((r) => r.partitionKey === "user-1" && r.value === "alice");
      expect(hasRow).toBe(true);
    }

    expect(state.events.some((e) => e.message === "Repair started")).toBe(true);
    expect(state.events.some((e) => e.message === "Repair: 1 mismatching range found")).toBe(true);
    expect(state.events.some((e) => e.message.match(/Repair: streamed \d+ row/s) && e.message.includes("to"))).toBe(true);
    expect(state.animation.repairingNodeId).not.toBeNull();
  });

  it("RUN_REPAIR restricts streaming to replica nodes for the active RF", () => {
    let state = createInitialCluster();
    const keyspace = state.keyspaces[0];

    // RF=2 so only two nodes hold each partition.
    state = clusterReducer(state, {
      type: "SET_REPLICATION_FACTOR",
      keyspaceId: keyspace.id,
      replicationFactor: 2,
    });

    // "a" hashes to token 97, owned by node-1. With RF=2 its replicas are node-1 and node-2.
    const owner = state.nodes.find((n) => n.name === "node-1")!;
    state = clusterReducer(state, {
      type: "WRITE_TO_NODE",
      nodeId: owner.id,
      partitionKey: "a",
      value: "alice",
    });

    state = clusterReducer(state, { type: "RUN_REPAIR" });

    const replicaIds = state.nodes
      .filter((n) => n.storage.memtable.some((r) => r.partitionKey === "a" && r.value === "alice"))
      .map((n) => n.id);

    expect(replicaIds).toContain(owner.id);
    expect(replicaIds).toHaveLength(2);

    const nonReplica = state.nodes.find((n) => !replicaIds.includes(n.id))!;
    const hasRow =
      nonReplica.storage.memtable.some((r) => r.partitionKey === "a") ||
      nonReplica.storage.sstables.some((s) => s.rows.some((r) => r.partitionKey === "a"));
    expect(hasRow).toBe(false);
  });

  it("RUN_REPAIR reports no replica pairs when RF is 1", () => {
    const state = createInitialCluster();
    expect(state.keyspaces[0].replicationFactor).toBe(1);

    const next = clusterReducer(state, { type: "RUN_REPAIR" });
    expect(next.events[1].message).toMatch(/Repair started/);
    expect(next.events[0].message).toMatch(/no replica pairs/);
  });

  it("RUN_REPAIR resolves conflicts using the latest timestamp", () => {
    let state = createInitialCluster();
    const keyspace = state.keyspaces[0];

    state = clusterReducer(state, {
      type: "SET_REPLICATION_FACTOR",
      keyspaceId: keyspace.id,
      replicationFactor: 3,
    });

    // Seed replicas with divergent timestamps directly to avoid millisecond collisions.
    state.nodes[0].storage.memtable.push({ partitionKey: "user-1", value: "alice", timestamp: 100 });
    state.nodes[1].storage.memtable.push({ partitionKey: "user-1", value: "alice", timestamp: 100 });
    state.nodes[2].storage.memtable.push({ partitionKey: "user-1", value: "bob", timestamp: 200 });

    state = clusterReducer(state, { type: "RUN_REPAIR" });

    for (const node of state.nodes) {
      const latest = node.storage.memtable
        .filter((r) => r.partitionKey === "user-1")
        .sort((a, b) => b.timestamp - a.timestamp)[0];
      expect(latest?.value).toBe("bob");
    }
  });
});
