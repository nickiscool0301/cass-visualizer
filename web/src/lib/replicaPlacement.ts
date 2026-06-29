import type { Node, TokenRange } from "../types/cluster";

export function getAllTokenPoints(
  nodes: Node[]
): { token: number; nodeId: string }[] {
  return nodes
    .flatMap((node) => node.tokens.map((token) => ({ token, nodeId: node.id })))
    .sort((a, b) => a.token - b.token);
}

export function getRangeOwnerToken(
  partitionToken: number,
  sortedTokens: { token: number; nodeId: string }[]
): { token: number; nodeId: string } {
  if (sortedTokens.length === 0) {
    throw new Error("No tokens on the ring");
  }
  for (const point of sortedTokens) {
    if (partitionToken <= point.token) {
      return point;
    }
  }
  return sortedTokens[0];
}

export function getReplicaNodeIds(
  partitionToken: number,
  rf: number,
  nodes: Node[]
): string[] {
  const sorted = getAllTokenPoints(nodes);
  if (sorted.length === 0 || rf <= 0) return [];

  const replicas: string[] = [];
  let startIndex = sorted.findIndex((p) => partitionToken <= p.token);
  if (startIndex === -1) startIndex = 0;

  for (let i = 0; i < sorted.length && replicas.length < rf; i++) {
    const point = sorted[(startIndex + i) % sorted.length];
    if (!replicas.includes(point.nodeId)) {
      replicas.push(point.nodeId);
    }
  }

  return replicas;
}

export function getConsistentReplicaSetForRange(
  range: [number, number],
  rf: number,
  nodes: Node[],
  tokenRange: [number, number]
): string[] | null {
  const [min, max] = tokenRange;
  const span = max - min + 1;
  const [start, end] = range;
  const rangeSize = start <= end ? end - start + 1 : span - (start - end - 1);

  let first: string[] | null = null;
  for (let i = 0; i < rangeSize; i++) {
    const token = min + ((start - min + i) % span);
    const replicas = getReplicaNodeIds(token, rf, nodes);
    if (first === null) {
      first = replicas;
    } else if (
      replicas.length !== first.length ||
      replicas.some((id, index) => id !== first![index])
    ) {
      return null;
    }
  }

  return first ?? [];
}

export function getNodeOwnedRanges(
  nodeId: string,
  nodes: Node[],
  tokenRange: [number, number]
): TokenRange[] {
  const sorted = getAllTokenPoints(nodes);
  if (sorted.length === 0) return [];

  return nodes
    .find((n) => n.id === nodeId)
    ?.tokens.map((token) => {
      const tokenIndex = sorted.findIndex(
        (p) => p.token === token && p.nodeId === nodeId
      );
      const prevIndex =
        (tokenIndex - 1 + sorted.length) % sorted.length;
      const start = (sorted[prevIndex].token + 1) % (tokenRange[1] + 1);
      return { start, end: token, ownerId: nodeId };
    }) ?? [];
}
