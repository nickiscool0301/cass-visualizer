import { describe, it, expect } from "vitest";
import { clusterReducer, createInitialCluster } from "../src/state/clusterReducer";

describe("clusterReducer read repair actions", () => {
  it("reads a consistent key without detecting mismatches", () => {
    let state = createInitialCluster();
    const keyspace = state.keyspaces[0];

    state = clusterReducer(state, {
      type: "SET_REPLICATION_FACTOR",
      keyspaceId: keyspace.id,
      replicationFactor: 3,
    });

    state = clusterReducer(state, { type: "WRITE", partitionKey: "user-1", value: "alice" });
    const coordinator = state.nodes.find((n) => n.id === state.animation.writeTargetNodeId)!;

    state = clusterReducer(state, { type: "READ", partitionKey: "user-1" });

    expect(state.lastReadResult).toEqual({
      partitionKey: "user-1",
      coordinatorId: coordinator.id,
      digestMismatches: [],
      resolvedValue: "alice",
    });
    expect(state.events[0].message).toBe("Read user-1: digests matched");
    expect(state.animation.readCoordinatorNodeId).toBe(coordinator.id);
  });

  it("detects a drifted replica and repairs to the latest timestamp", () => {
    let state = createInitialCluster();
    const keyspace = state.keyspaces[0];

    state = clusterReducer(state, {
      type: "SET_REPLICATION_FACTOR",
      keyspaceId: keyspace.id,
      replicationFactor: 3,
    });

    state = clusterReducer(state, { type: "WRITE", partitionKey: "user-1", value: "alice" });

    const staleNode = state.nodes.find((n) => n.id !== state.animation.writeTargetNodeId)!;
    staleNode.storage.memtable.push({
      partitionKey: "user-1",
      value: "bob",
      timestamp: Date.now() + 1000,
    });

    state = clusterReducer(state, { type: "READ", partitionKey: "user-1" });

    expect(state.lastReadResult?.partitionKey).toBe("user-1");
    expect(state.lastReadResult?.digestMismatches).toContain(staleNode.id);
    expect(state.events[0].message).toBe("Read user-1: digest mismatch detected");

    state = clusterReducer(state, { type: "EXECUTE_READ_REPAIR", partitionKey: "user-1" });

    expect(state.lastReadResult?.resolvedValue).toBe("bob");
    expect(state.events[0].message).toMatch(/Read repair resolved user-1 -> bob; repaired/);

    for (const node of state.nodes) {
      const latest = node.storage.memtable
        .filter((r) => r.partitionKey === "user-1")
        .sort((a, b) => b.timestamp - a.timestamp)[0];
      expect(latest?.value).toBe("bob");
    }
  });

  it("resolves a tombstone over an older value during read repair", () => {
    let state = createInitialCluster();
    const keyspace = state.keyspaces[0];

    state = clusterReducer(state, {
      type: "SET_REPLICATION_FACTOR",
      keyspaceId: keyspace.id,
      replicationFactor: 3,
    });

    state = clusterReducer(state, { type: "WRITE", partitionKey: "user-1", value: "alice" });

    const tombstoneNode = state.nodes.find((n) => n.id !== state.animation.writeTargetNodeId)!;
    tombstoneNode.storage.memtable.push({
      partitionKey: "user-1",
      value: "[TOMBSTONE]",
      timestamp: Date.now() + 1000,
      isTombstone: true,
    });

    state = clusterReducer(state, { type: "READ", partitionKey: "user-1" });
    expect(state.lastReadResult?.digestMismatches.length).toBeGreaterThan(0);

    state = clusterReducer(state, { type: "EXECUTE_READ_REPAIR", partitionKey: "user-1" });

    expect(state.lastReadResult?.resolvedValue).toBe("[TOMBSTONE]");

    for (const node of state.nodes) {
      const latest = node.storage.memtable
        .filter((r) => r.partitionKey === "user-1")
        .sort((a, b) => b.timestamp - a.timestamp)[0];
      expect(latest?.isTombstone).toBe(true);
      expect(latest?.value).toBe("[TOMBSTONE]");
    }
  });
});
