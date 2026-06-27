import type { Node, NodeStorage } from "../src/types/cluster";

export function emptyStorage(): NodeStorage {
  return { commitLog: [], memtable: [], sstables: [] };
}

export function makeNode(partial: Omit<Node, "storage">): Node {
  return { ...partial, storage: emptyStorage() };
}
