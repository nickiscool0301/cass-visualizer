import { describe, it, expect } from "vitest";
import { clusterReducer, createInitialCluster } from "../src/state/clusterReducer";

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
});
