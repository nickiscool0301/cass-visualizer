import { describe, it, expect } from "vitest";
import { clusterReducer, createInitialCluster } from "../src/state/clusterReducer";

const initial = createInitialCluster();

describe("clusterReducer LWT", () => {
  it("commits an LWT with majority when RF=3", () => {
    let state = initial;
    const ks = state.keyspaces[0];
    state = clusterReducer(state, {
      type: "SET_REPLICATION_FACTOR",
      keyspaceId: ks.id,
      replicationFactor: 3,
    });
    state = clusterReducer(state, { type: "LWT_PROPOSE", partitionKey: "user-1", value: "alice" });

    expect(state.events[0].message).toMatch(/LWT user-1=alice committed/);
    const replicas = state.nodes.filter((n) =>
      n.storage.memtable.some((r) => r.partitionKey === "user-1" && r.value === "alice")
    );
    expect(replicas.length).toBeGreaterThanOrEqual(2);
  });

  it("rejects an LWT when no live replicas are reachable", () => {
    let state = initial;
    const ks = state.keyspaces[0];
    state = clusterReducer(state, {
      type: "SET_REPLICATION_FACTOR",
      keyspaceId: ks.id,
      replicationFactor: 1,
    });
    for (const node of state.nodes) {
      state = clusterReducer(state, { type: "TOGGLE_NODE_STATUS", nodeId: node.id });
    }
    state = clusterReducer(state, { type: "LWT_PROPOSE", partitionKey: "user-1", value: "alice" });

    expect(state.events[0].message).toMatch(/LWT user-1 rejected: no majority/);
  });

  it("resolves one winner during contention", () => {
    let state = initial;
    const ks = state.keyspaces[0];
    state = clusterReducer(state, {
      type: "SET_REPLICATION_FACTOR",
      keyspaceId: ks.id,
      replicationFactor: 3,
    });
    state = clusterReducer(state, {
      type: "LWT_CONTEND",
      partitionKey: "user-1",
      valueA: "alice",
      valueB: "bob",
    });

    expect(state.events[0].message).toMatch(/Contention on user-1:/);
    const memtables = state.nodes.map((n) => n.storage.memtable);
    const hasAlice = memtables.some((m) => m.some((r) => r.partitionKey === "user-1" && r.value === "alice"));
    const hasBob = memtables.some((m) => m.some((r) => r.partitionKey === "user-1" && r.value === "bob"));
    expect(hasAlice || hasBob).toBe(true);
  });

  it("LWT_COMMIT writes when ballot is still highest promised", () => {
    let state = initial;
    const ks = state.keyspaces[0];
    state = clusterReducer(state, {
      type: "SET_REPLICATION_FACTOR",
      keyspaceId: ks.id,
      replicationFactor: 3,
    });
    state = clusterReducer(state, { type: "LWT_COMMIT", partitionKey: "user-1", value: "alice", ballot: 100 });

    expect(state.events[0].message).toMatch(/LWT user-1=alice committed \(ballot 100\)/);
  });
});
