import type { MerkleNode, StoredRow } from "../types/cluster";

export const REPAIR_MERKLE_DEPTH = 3;

export function hashString(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

export function hashPartitionKey(key: string, tokenRange: [number, number]): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const [min, max] = tokenRange;
  const span = max - min + 1;
  return min + (Math.abs(hash) % span);
}

function tokenInRange(token: number, range: [number, number]): boolean {
  const [start, end] = range;
  return token >= start && token <= end;
}

function leafHash(rows: StoredRow[], tokenRange: [number, number]): string {
  const sorted = [...rows].sort((a, b) => {
    const tokenDiff = hashPartitionKey(a.partitionKey, tokenRange) - hashPartitionKey(b.partitionKey, tokenRange);
    if (tokenDiff !== 0) return tokenDiff;
    return a.partitionKey.localeCompare(b.partitionKey);
  });
  const payload = sorted.map((r) => `${r.partitionKey}|${r.value}|${r.timestamp}|${!!r.isTombstone}|${r.expiresAt ?? ""}`).join("#");
  return hashString(payload);
}

export function buildMerkleTree(
  rows: StoredRow[],
  tokenRange: [number, number],
  depth: number = REPAIR_MERKLE_DEPTH,
  fullTokenRange: [number, number] = tokenRange
): MerkleNode {
  const [start, end] = tokenRange;

  if (depth === 0 || start === end) {
    const rowsInRange = rows.filter((r) =>
      tokenInRange(hashPartitionKey(r.partitionKey, fullTokenRange), tokenRange)
    );
    return {
      hash: leafHash(rowsInRange, fullTokenRange),
      range: tokenRange,
    };
  }

  const span = end - start + 1;
  const mid = start + Math.floor((span - 1) / 2);
  const leftRange: [number, number] = [start, mid];
  const rightRange: [number, number] = [mid + 1, end];

  const left = buildMerkleTree(
    rows.filter((r) => tokenInRange(hashPartitionKey(r.partitionKey, fullTokenRange), leftRange)),
    leftRange,
    depth - 1,
    fullTokenRange
  );
  const right = buildMerkleTree(
    rows.filter((r) => tokenInRange(hashPartitionKey(r.partitionKey, fullTokenRange), rightRange)),
    rightRange,
    depth - 1,
    fullTokenRange
  );

  const children = [left, right];
  const payload = children.map((c) => c.hash).join("");

  return {
    hash: hashString(payload),
    range: tokenRange,
    children,
  };
}

export function collectLeafRanges(node: MerkleNode): Array<[number, number]> {
  if (!node.children || node.children.length === 0) {
    return [node.range];
  }
  return node.children.flatMap(collectLeafRanges);
}

export function findLeafForRange(
  tree: MerkleNode,
  range: [number, number]
): MerkleNode | null {
  if (
    tree.range[0] === range[0] &&
    tree.range[1] === range[1]
  ) {
    if (!tree.children || tree.children.length === 0) {
      return tree;
    }
  }

  if (!tree.children || tree.children.length === 0) {
    return null;
  }

  for (const child of tree.children) {
    const leaf = findLeafForRange(child, range);
    if (leaf) return leaf;
  }

  return null;
}
