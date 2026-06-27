import type { Node, TokenRange } from "../types/cluster";
import { getNodeOwnedRanges } from "./replicaPlacement";

export interface ArcSegment {
  nodeId: string;
  startAngle: number;
  endAngle: number;
  startToken: number;
  endToken: number;
  color: string;
}

function tokenToAngle(token: number, tokenRange: [number, number]): number {
  const [min, max] = tokenRange;
  const ratio = (token - min) / (max - min + 1);
  return ratio * 2 * Math.PI;
}

function normalizeRange(range: TokenRange, tokenRange: [number, number]): { start: number; end: number } {
  const [min, max] = tokenRange;
  let start = range.start;
  let end = range.end;
  if (end < start) {
    end += max - min + 1;
  }
  return { start, end };
}

export function getRingArcs(
  nodes: Node[],
  tokenRange: [number, number],
  size: number
): ArcSegment[] {
  const arcs: ArcSegment[] = [];
  for (const node of nodes) {
    const ranges = getNodeOwnedRanges(node.id, nodes, tokenRange);
    for (const range of ranges) {
      const { start, end } = normalizeRange(range, tokenRange);
      arcs.push({
        nodeId: node.id,
        startAngle: tokenToAngle(start, tokenRange),
        endAngle: tokenToAngle(end, tokenRange),
        startToken: range.start,
        endToken: range.end,
        color: node.color,
      });
    }
  }
  return arcs;
}

export interface RingDimensions {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  radius: number;
  strokeWidth: number;
}

export function getRingDimensions(size: number): RingDimensions {
  return {
    width: size,
    height: size,
    centerX: size / 2,
    centerY: size / 2,
    radius: size * 0.4,
    strokeWidth: size * 0.12,
  };
}
