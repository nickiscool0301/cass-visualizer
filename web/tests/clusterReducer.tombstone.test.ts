import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { clusterReducer, createInitialCluster } from "../src/state/clusterReducer";

describe("clusterReducer tombstone / TTL handling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("DELETE creates tombstones on replica commit log and memtable", () => {
    const initial = createInitialCluster();
    const next = clusterReducer(initial, { type: "DELETE", partitionKey: "user-1" });

    const replica = next.nodes.find((n) =>
      n.storage.memtable.some((r) => r.partitionKey === "user-1")
    );
    expect(replica).toBeDefined();

    const memtableRow = replica!.storage.memtable.find((r) => r.partitionKey === "user-1")!;
    expect(memtableRow.isTombstone).toBe(true);
    expect(memtableRow.value).toBe("[TOMBSTONE]");

    const commitLogRow = replica!.storage.commitLog.find((r) => r.partitionKey === "user-1")!;
    expect(commitLogRow.isTombstone).toBe(true);
    expect(commitLogRow.value).toBe("[TOMBSTONE]");

    expect(next.events[0].message).toMatch(/Deleted user-1 on \d+ replica\(s\)/);
  });

  it("WRITE_TTL sets ttl and expiresAt on replicas", () => {
    vi.setSystemTime(1_000_000);
    const initial = createInitialCluster();
    const next = clusterReducer(initial, {
      type: "WRITE_TTL",
      partitionKey: "session-1",
      value: "active",
      ttlSeconds: 60,
    });

    const replica = next.nodes.find((n) =>
      n.storage.memtable.some((r) => r.partitionKey === "session-1")
    )!;
    const row = replica.storage.memtable.find((r) => r.partitionKey === "session-1")!;

    expect(row.value).toBe("active");
    expect(row.ttl).toBe(60);
    expect(row.expiresAt).toBe(1_000_000 + 60 * 1000);
    expect(row.isTombstone).toBeFalsy();
    expect(next.events[0].message).toMatch(/Wrote session-1 with TTL 60s on \d+ replica\(s\)/);
  });

  it("TICK_TTL converts expired TTL rows to tombstones in memtables", () => {
    vi.setSystemTime(1_000_000);
    const initial = createInitialCluster();
    let state = clusterReducer(initial, {
      type: "WRITE_TTL",
      partitionKey: "session-1",
      value: "active",
      ttlSeconds: 10,
    });

    vi.advanceTimersByTime(10_000);
    state = clusterReducer(state, { type: "TICK_TTL" });

    const replica = state.nodes.find((n) =>
      n.storage.memtable.some((r) => r.partitionKey === "session-1")
    )!;
    const row = replica.storage.memtable.find((r) => r.partitionKey === "session-1")!;

    expect(row.isTombstone).toBe(true);
    expect(row.value).toBe("[TOMBSTONE]");
    expect(row.timestamp).toBe(1_010_000);
    expect(state.events[0].message).toMatch(/TTL expired for session-1/);
  });

  it("TICK_TTL does nothing when no TTL rows have expired", () => {
    vi.setSystemTime(1_000_000);
    const initial = createInitialCluster();
    let state = clusterReducer(initial, {
      type: "WRITE_TTL",
      partitionKey: "session-1",
      value: "active",
      ttlSeconds: 60,
    });

    const beforeEventCount = state.events.length;
    vi.advanceTimersByTime(10_000);
    state = clusterReducer(state, { type: "TICK_TTL" });

    const replica = state.nodes.find((n) =>
      n.storage.memtable.some((r) => r.partitionKey === "session-1")
    )!;
    const row = replica.storage.memtable.find((r) => r.partitionKey === "session-1")!;

    expect(row.isTombstone).toBeFalsy();
    expect(state.events.length).toBe(beforeEventCount);
  });

  it("compaction retains young tombstones", () => {
    vi.setSystemTime(1_000_000);
    let state = createInitialCluster();
    state = clusterReducer(state, { type: "WRITE", partitionKey: "user-1", value: "alice" });

    const replica = state.nodes.find((n) => n.storage.memtable.length > 0)!;
    state = clusterReducer(state, { type: "FLUSH_MEMTABLE", nodeId: replica.id });

    vi.advanceTimersByTime(1_000);
    state = clusterReducer(state, { type: "DELETE", partitionKey: "user-1" });
    state = clusterReducer(state, { type: "FLUSH_MEMTABLE", nodeId: replica.id });

    expect(state.nodes.find((n) => n.id === replica.id)!.storage.sstables).toHaveLength(2);

    // Large gc_grace keeps the tombstone around.
    state = clusterReducer(state, { type: "SET_GC_GRACE_SECONDS", seconds: 1_000_000 });
    state = clusterReducer(state, { type: "COMPACT", nodeId: replica.id });

    const compactedRows = state.nodes
      .find((n) => n.id === replica.id)!
      .storage.sstables.flatMap((s) => s.rows);
    expect(compactedRows.some((r) => r.partitionKey === "user-1" && r.isTombstone)).toBe(true);
  });

  it("compaction purges tombstones older than gcGraceSeconds", () => {
    vi.setSystemTime(1_000_000);
    const initial = createInitialCluster();
    const replica = initial.nodes[0];

    const state: typeof initial = {
      ...initial,
      nodes: initial.nodes.map((node) =>
        node.id === replica.id
          ? {
              ...node,
              storage: {
                ...node.storage,
                sstables: [
                  {
                    id: "sstable-tombstone-1",
                    level: 0,
                    createdAt: 1_000_000,
                    rows: [
                      { partitionKey: "user-1", value: "[TOMBSTONE]", timestamp: 900_000, isTombstone: true },
                    ],
                  },
                  {
                    id: "sstable-tombstone-2",
                    level: 0,
                    createdAt: 1_000_001,
                    rows: [
                      { partitionKey: "user-2", value: "[TOMBSTONE]", timestamp: 900_001, isTombstone: true },
                    ],
                  },
                  {
                    id: "sstable-tombstone-3",
                    level: 0,
                    createdAt: 1_000_002,
                    rows: [
                      { partitionKey: "user-3", value: "[TOMBSTONE]", timestamp: 900_002, isTombstone: true },
                    ],
                  },
                  {
                    id: "sstable-tombstone-4",
                    level: 0,
                    createdAt: 1_000_003,
                    rows: [
                      { partitionKey: "user-4", value: "[TOMBSTONE]", timestamp: 900_003, isTombstone: true },
                    ],
                  },
                ],
              },
            }
          : node
      ),
    };

    // Zero gc_grace means any tombstone older than 0ms is eligible for removal.
    let next = clusterReducer(state, { type: "SET_GC_GRACE_SECONDS", seconds: 0 });
    next = clusterReducer(next, { type: "COMPACT", nodeId: replica.id });

    const compactedRows = next.nodes
      .find((n) => n.id === replica.id)!
      .storage.sstables.flatMap((s) => s.rows);
    expect(compactedRows.some((r) => r.isTombstone)).toBe(false);
  });

  it("SET_GC_GRACE_SECONDS updates the cluster setting", () => {
    const initial = createInitialCluster();
    const next = clusterReducer(initial, { type: "SET_GC_GRACE_SECONDS", seconds: 42 });
    expect(next.gcGraceSeconds).toBe(42);
    expect(next.events[0].message).toMatch(/gc_grace_seconds set to 42/);
  });
});
