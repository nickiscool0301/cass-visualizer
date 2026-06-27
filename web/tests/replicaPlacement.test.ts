import { describe, it, expect } from "vitest";
import {
  getAllTokenPoints,
  getRangeOwnerToken,
  getReplicaNodeIds,
  getNodeOwnedRanges,
} from "../src/lib/replicaPlacement";
import type { Node } from "../src/types/cluster";

const nodes: Node[] = [
  { id: "a", name: "A", tokens: [250], status: "up", color: "#a00" },
  { id: "b", name: "B", tokens: [500], status: "up", color: "#0a0" },
  { id: "c", name: "C", tokens: [750], status: "up", color: "#00a" },
];

describe("getAllTokenPoints", () => {
  it("returns sorted token-to-node mappings", () => {
    const points = getAllTokenPoints(nodes);
    expect(points).toEqual([
      { token: 250, nodeId: "a" },
      { token: 500, nodeId: "b" },
      { token: 750, nodeId: "c" },
    ]);
  });
});

describe("getRangeOwnerToken", () => {
  it("finds the first token clockwise from a partition token", () => {
    const sorted = getAllTokenPoints(nodes);
    expect(getRangeOwnerToken(0, sorted).nodeId).toBe("a");
    expect(getRangeOwnerToken(251, sorted).nodeId).toBe("b");
    expect(getRangeOwnerToken(751, sorted).nodeId).toBe("a");
  });
});

describe("getReplicaNodeIds", () => {
  it("returns RF distinct nodes clockwise", () => {
    expect(getReplicaNodeIds(100, 2, nodes)).toEqual(["a", "b"]);
    expect(getReplicaNodeIds(600, 3, nodes)).toEqual(["c", "a", "b"]);
  });

  it("returns as many replicas as available when RF exceeds node count", () => {
    expect(getReplicaNodeIds(100, 5, nodes)).toEqual(["a", "b", "c"]);
  });
});

describe("getNodeOwnedRanges", () => {
  it("returns ranges ending at the node's tokens", () => {
    const ranges = getNodeOwnedRanges("a", nodes, [0, 999]);
    expect(ranges).toEqual([
      { start: 751, end: 250, ownerId: "a" },
    ]);
  });

  it("returns multiple ranges for a node with multiple tokens", () => {
    const multi: Node = {
      id: "m",
      name: "M",
      tokens: [200, 600],
      status: "up",
      color: "#000",
    };
    const others: Node[] = [
      { id: "x", name: "X", tokens: [400, 800], status: "up", color: "#fff" },
    ];
    const ranges = getNodeOwnedRanges("m", [multi, others[0]], [0, 999]);
    expect(ranges).toContainEqual({ start: 801, end: 200, ownerId: "m" });
    expect(ranges).toContainEqual({ start: 401, end: 600, ownerId: "m" });
  });
});
