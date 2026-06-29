import { describe, it, expect } from "vitest";
import { clusterReducer, createInitialCluster } from "../src/state/clusterReducer";

const initial = createInitialCluster();

describe("clusterReducer hinted handoffs", () => {
  it("toggles a node between up and down", () => {
    const target = initial.nodes[1];
    const down = clusterReducer(initial, { type: "TOGGLE_NODE_STATUS", nodeId: target.id });
    expect(down.nodes.find((n) => n.id === target.id)!.status).toBe("down");
    expect(down.events[0].message).toMatch(/is now down/);

    const up = clusterReducer(down, { type: "TOGGLE_NODE_STATUS", nodeId: target.id });
    expect(up.nodes.find((n) => n.id === target.id)!.status).toBe("up");
    expect(up.events[0].message).toMatch(/is now up/);
  });

  it("stores a hint when a replica is down during a write", () => {
    let state = initial;
    const ks = state.keyspaces[0];
    state = clusterReducer(state, {
      type: "SET_REPLICATION_FACTOR",
      keyspaceId: ks.id,
      replicationFactor: 3,
    });
    const target = state.nodes[1];
    state = clusterReducer(state, { type: "TOGGLE_NODE_STATUS", nodeId: target.id });
    state = clusterReducer(state, { type: "WRITE", partitionKey: "user-1", value: "alice" });

    const coordinator = state.nodes.find((n) => n.storage.hints.length > 0);
    expect(coordinator).toBeDefined();
    expect(coordinator!.storage.hints[0]).toMatchObject({
      targetNodeId: target.id,
      partitionKey: "user-1",
      value: "alice",
      isTombstone: false,
    });
    expect(state.events[0].message).toMatch(/Stored hint/);
  });

  it("replays hints when a node is brought online", () => {
    let state = initial;
    const ks = state.keyspaces[0];
    state = clusterReducer(state, {
      type: "SET_REPLICATION_FACTOR",
      keyspaceId: ks.id,
      replicationFactor: 3,
    });
    const target = state.nodes[1];
    state = clusterReducer(state, { type: "TOGGLE_NODE_STATUS", nodeId: target.id });
    state = clusterReducer(state, { type: "WRITE", partitionKey: "user-1", value: "alice" });

    state = clusterReducer(state, { type: "BRING_NODE_ONLINE", nodeId: target.id });

    const revived = state.nodes.find((n) => n.id === target.id)!;
    expect(revived.status).toBe("up");
    expect(revived.storage.memtable.some((r) => r.partitionKey === "user-1" && r.value === "alice")).toBe(true);
    expect(state.events[1].message).toMatch(/came online/);
    expect(state.events[0].message).toMatch(/Replaying 1 hint/);

    const coordinator = state.nodes.find((n) => n.storage.hints.length > 0);
    expect(coordinator).toBeUndefined();
  });

  it("preserves timestamps and tombstone status when replaying hints", () => {
    let state = initial;
    const ks = state.keyspaces[0];
    state = clusterReducer(state, {
      type: "SET_REPLICATION_FACTOR",
      keyspaceId: ks.id,
      replicationFactor: 3,
    });
    const target = state.nodes[1];
    state = clusterReducer(state, { type: "TOGGLE_NODE_STATUS", nodeId: target.id });
    state = clusterReducer(state, { type: "DELETE", partitionKey: "user-1" });

    const coordinatorBefore = state.nodes.find((n) => n.storage.hints.length > 0)!;
    const hint = coordinatorBefore.storage.hints[0];
    expect(hint.isTombstone).toBe(true);
    expect(hint.value).toBe("[TOMBSTONE]");

    state = clusterReducer(state, { type: "BRING_NODE_ONLINE", nodeId: target.id });

    const revived = state.nodes.find((n) => n.id === target.id)!;
    const replayedRow = revived.storage.memtable.find((r) => r.partitionKey === "user-1")!;
    expect(replayedRow.isTombstone).toBe(true);
    expect(replayedRow.timestamp).toBe(hint.timestamp);
  });

  it("SEND_HINTS replays hints without changing node status", () => {
    let state = initial;
    const ks = state.keyspaces[0];
    state = clusterReducer(state, {
      type: "SET_REPLICATION_FACTOR",
      keyspaceId: ks.id,
      replicationFactor: 3,
    });
    const target = state.nodes[1];
    state = clusterReducer(state, { type: "TOGGLE_NODE_STATUS", nodeId: target.id });
    state = clusterReducer(state, { type: "WRITE", partitionKey: "user-1", value: "alice" });

    state = clusterReducer(state, { type: "SEND_HINTS", nodeId: target.id });

    const revived = state.nodes.find((n) => n.id === target.id)!;
    expect(revived.status).toBe("down");
    expect(revived.storage.memtable.some((r) => r.partitionKey === "user-1")).toBe(true);
    expect(state.events[0].message).toMatch(/Replaying 1 hint/);
  });

  it("BRING_NODE_ONLINE is a no-op for already-online nodes", () => {
    const state = clusterReducer(initial, { type: "BRING_NODE_ONLINE", nodeId: initial.nodes[0].id });
    expect(state.events[0].message).toMatch(/is already online/);
  });
});
