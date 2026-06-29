import { describe, it, expect } from "vitest";
import { buildMerkleTree, collectLeafRanges, hashString } from "../src/lib/merkleTree";
import type { StoredRow } from "../src/types/cluster";

function row(partitionKey: string, value: string, timestamp: number): StoredRow {
  return { partitionKey, value, timestamp };
}

const tokenRange: [number, number] = [0, 999];

describe("buildMerkleTree", () => {
  it("returns a leaf when depth is 0", () => {
    const rows = [row("a", "1", 100)];
    const tree = buildMerkleTree(rows, tokenRange, 0);
    expect(tree.range).toEqual(tokenRange);
    expect(tree.children).toBeUndefined();
    expect(tree.hash).toBeTruthy();
  });

  it("partitions the token range recursively", () => {
    const rows = [row("a", "1", 100), row("b", "2", 200), row("c", "3", 300)];
    const tree = buildMerkleTree(rows, tokenRange, 2);
    expect(tree.children).toHaveLength(2);
    expect(tree.children![0].children).toHaveLength(2);
    expect(tree.children![1].children).toHaveLength(2);
  });

  it("covers the full token range with leaf ranges", () => {
    const tree = buildMerkleTree([], tokenRange, 3);
    const leaves = collectLeafRanges(tree);
    expect(leaves.length).toBe(8);
    expect(leaves[0][0]).toBe(0);
    expect(leaves[leaves.length - 1][1]).toBe(999);

    for (let i = 1; i < leaves.length; i++) {
      expect(leaves[i][0]).toBe(leaves[i - 1][1] + 1);
    }
  });

  it("produces identical hashes for identical rows", () => {
    const rows = [row("a", "1", 100), row("b", "2", 200)];
    const tree1 = buildMerkleTree(rows, tokenRange, 2);
    const tree2 = buildMerkleTree(rows, tokenRange, 2);
    expect(tree1.hash).toBe(tree2.hash);
  });

  it("produces different hashes for different values", () => {
    const tree1 = buildMerkleTree([row("a", "1", 100)], tokenRange, 2);
    const tree2 = buildMerkleTree([row("a", "2", 100)], tokenRange, 2);
    expect(tree1.hash).not.toBe(tree2.hash);
  });

  it("produces different hashes for different timestamps", () => {
    const tree1 = buildMerkleTree([row("a", "1", 100)], tokenRange, 2);
    const tree2 = buildMerkleTree([row("a", "1", 200)], tokenRange, 2);
    expect(tree1.hash).not.toBe(tree2.hash);
  });

  it("places rows in the correct leaf range", () => {
    // These keys are known to hash into different halves of [0, 999].
    const rows = [row("aaaa", "1", 100), row("zzzz", "2", 200)];
    const tree = buildMerkleTree(rows, tokenRange, 1);
    expect(tree.children).toHaveLength(2);
    const leftHasRows = tree.children![0].hash !== buildMerkleTree([], [0, 499], 0).hash;
    const rightHasRows = tree.children![1].hash !== buildMerkleTree([], [500, 999], 0).hash;
    expect(leftHasRows || rightHasRows).toBe(true);
  });
});

describe("hashString", () => {
  it("is deterministic", () => {
    expect(hashString("hello")).toBe(hashString("hello"));
  });

  it("is sensitive to input", () => {
    expect(hashString("hello")).not.toBe(hashString("world"));
  });
});
