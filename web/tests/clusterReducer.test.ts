import { describe, it, expect } from "vitest";
import { clusterReducer, createInitialCluster } from "../src/state/clusterReducer";

const initial = createInitialCluster();

describe("clusterReducer", () => {
  it("adds a node", () => {
    const next = clusterReducer(initial, { type: "ADD_NODE" });
    expect(next.nodes).toHaveLength(initial.nodes.length + 1);
    expect(next.events[0].message).toMatch(/added/);
    expect(next.animation.joiningNodeId).toBeDefined();
  });

  it("splits the largest range when adding a node", () => {
    const next = clusterReducer(initial, { type: "ADD_NODE" });
    const newNode = next.nodes[next.nodes.length - 1];
    expect(newNode.tokens.length).toBe(1);
    expect(newNode.tokens[0]).toBeGreaterThanOrEqual(0);
    expect(newNode.tokens[0]).toBeLessThanOrEqual(999);
    const event = next.events[0].message;
    expect(event).toMatch(/streaming data from/);
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
    expect(next.events[0].message).toMatch(/Cannot remove the last node/);
  });

  it("does not reuse node names after removals", () => {
    // initial: node-1, node-2, node-3
    const withoutNode2 = clusterReducer(initial, { type: "REMOVE_NODE", nodeId: initial.nodes[1].id });
    const addedAfterRemoval = clusterReducer(withoutNode2, { type: "ADD_NODE" });
    const names = addedAfterRemoval.nodes.map((n) => n.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain("node-4");
  });

  it("does not reuse colors while palette entries remain available", () => {
    // Remove a node to free its color, then add a node and confirm color uniqueness.
    const withoutNode2 = clusterReducer(initial, { type: "REMOVE_NODE", nodeId: initial.nodes[1].id });
    const addedAfterRemoval = clusterReducer(withoutNode2, { type: "ADD_NODE" });
    const colors = addedAfterRemoval.nodes.map((n) => n.color);
    expect(new Set(colors).size).toBe(colors.length);
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

  it("writes to the primary replica's memtable and commit log", () => {
    const next = clusterReducer(initial, { type: "WRITE", partitionKey: "user-1", value: "alice" });
    const replica = next.nodes.find((n) => n.storage.memtable.some((r) => r.partitionKey === "user-1"));
    expect(replica).toBeDefined();
    expect(replica!.storage.commitLog.some((r) => r.partitionKey === "user-1")).toBe(true);
    expect(next.events[0].message).toMatch(/Write to/);
  });

  it("flushes memtable to SSTable", () => {
    let state = initial;
    for (let i = 0; i < 5; i++) {
      state = clusterReducer(state, { type: "WRITE", partitionKey: `k${i}`, value: `v${i}` });
    }
    const replica = state.nodes.find((n) => n.storage.sstables.length > 0);
    expect(replica).toBeDefined();
    expect(replica!.storage.memtable.length).toBe(0);
  });

  it("flushes memtable on demand", () => {
    const afterWrite = clusterReducer(initial, { type: "WRITE", partitionKey: "x", value: "y" });
    const replica = afterWrite.nodes.find((n) => n.storage.memtable.length > 0)!;
    const flushed = clusterReducer(afterWrite, { type: "FLUSH_MEMTABLE", nodeId: replica.id });
    const updated = flushed.nodes.find((n) => n.id === replica.id)!;
    expect(updated.storage.sstables).toHaveLength(1);
    expect(updated.storage.memtable).toHaveLength(0);
  });

  it("compacts SSTables with STCS", () => {
    let state = initial;
    for (let i = 0; i < 20; i++) {
      state = clusterReducer(state, { type: "WRITE", partitionKey: `k${i}`, value: `v${i}` });
    }
    const target = state.nodes.find((n) => n.storage.sstables.length >= 4)!;
    const beforeCount = target.storage.sstables.length;
    const compacted = clusterReducer(state, { type: "COMPACT", nodeId: target.id });
    const updated = compacted.nodes.find((n) => n.id === target.id)!;
    expect(updated.storage.sstables.length).toBeLessThan(beforeCount);
  });

  it("sets compaction strategy", () => {
    const ks = initial.keyspaces[0];
    const next = clusterReducer(initial, {
      type: "SET_COMPACTION_STRATEGY",
      keyspaceId: ks.id,
      strategy: "LCS",
    });
    expect(next.keyspaces[0].compactionStrategy).toBe("LCS");
  });
});
