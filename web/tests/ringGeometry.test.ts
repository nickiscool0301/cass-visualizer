import { describe, it, expect } from "vitest";
import { getRingArcs } from "../src/lib/ringGeometry";
import type { Node } from "../src/types/cluster";

const nodes: Node[] = [
  { id: "a", name: "A", tokens: [250], status: "up", color: "#a00" },
  { id: "b", name: "B", tokens: [500], status: "up", color: "#0a0" },
  { id: "c", name: "C", tokens: [750], status: "up", color: "#00a" },
];

describe("getRingArcs", () => {
  it("returns one arc per node range", () => {
    const arcs = getRingArcs(nodes, [0, 999], 200);
    expect(arcs).toHaveLength(3);
    const a = arcs.find((arc) => arc.nodeId === "a");
    expect(a).toBeDefined();
    expect(a!.startAngle).toBeLessThan(a!.endAngle);
  });
});
