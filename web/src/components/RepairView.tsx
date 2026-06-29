import type { Cluster, MerkleNode, Node } from "../types/cluster";
import type { ClusterAction } from "../state/clusterReducer";
import { mergeRows } from "../state/clusterReducer";
import { buildMerkleTree } from "../lib/merkleTree";

interface RepairViewProps {
  cluster: Cluster;
  dispatch: React.Dispatch<ClusterAction>;
}

const TREE_DEPTH = 2;

function findMismatchedLeafRanges(trees: Map<string, MerkleNode>): Array<[number, number]> {
  const nodes = Array.from(trees.values());
  if (nodes.length === 0) return [];
  const leavesPerNode = nodes.map((tree) => {
    const leaves: MerkleNode[] = [];
    const walk = (n: MerkleNode) => {
      if (!n.children || n.children.length === 0) {
        leaves.push(n);
        return;
      }
      n.children.forEach(walk);
    };
    walk(tree);
    return leaves;
  });

  const rangeCount = leavesPerNode[0]?.length ?? 0;
  const mismatched: Array<[number, number]> = [];
  for (let i = 0; i < rangeCount; i++) {
    const hashes = new Set(leavesPerNode.map((leaves) => leaves[i]?.hash));
    if (hashes.size > 1) {
      mismatched.push(leavesPerNode[0][i].range);
    }
  }
  return mismatched;
}

function isRangeMismatched(range: [number, number], mismatches: Array<[number, number]>): boolean {
  return mismatches.some(([start, end]) => range[0] === start && range[1] === end);
}

function MerkleTreeBox({
  node,
  mismatchedRanges,
}: {
  node: MerkleNode;
  mismatchedRanges: Array<[number, number]>;
}) {
  const hue = parseInt(node.hash.slice(0, 8), 16) % 360;
  const color = `hsl(${hue}, 70%, 50%)`;
  const isLeaf = !node.children || node.children.length === 0;
  const isMismatched = isRangeMismatched(node.range, mismatchedRanges);

  return (
    <div
      title={`Token range ${node.range[0]}-${node.range[1]} · hash ${node.hash}`}
      className={`flex-1 ${isLeaf ? "rounded-sm" : "rounded"} ${isMismatched && isLeaf ? "ring-2 ring-amber-400" : ""}`}
      style={{
        backgroundColor: color,
        minHeight: isLeaf ? "1.5rem" : undefined,
      }}
    >
      {!isLeaf && (
        <div className="flex h-full gap-0.5 p-0.5">
          {node.children!.map((child, i) => (
            <MerkleTreeBox key={i} node={child} mismatchedRanges={mismatchedRanges} />
          ))}
        </div>
      )}
    </div>
  );
}

function NodeRepairCard({
  node,
  tree,
  mismatchedRanges,
  isRepairTarget,
}: {
  node: Node;
  tree: MerkleNode;
  mismatchedRanges: Array<[number, number]>;
  isRepairTarget: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 transition-all duration-300 ${isRepairTarget ? "animate-glow" : ""}`}
      style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-2 border-b pb-2 mb-3" style={{ borderColor: "var(--border-subtle)" }}>
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: node.color }} />
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {node.name}
        </h3>
      </div>
      <div className="flex h-16 w-full flex-col gap-0.5 rounded border p-0.5" style={{ borderColor: "var(--border)" }}>
        <MerkleTreeBox node={tree} mismatchedRanges={mismatchedRanges} />
      </div>
      <p className="mt-2 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
        Root hash: <span className="font-mono-data" style={{ color: "var(--text-secondary)" }}>{tree.hash}</span>
      </p>
    </div>
  );
}

export function RepairView({ cluster, dispatch }: RepairViewProps) {
  const trees = new Map<string, MerkleNode>();
  for (const node of cluster.nodes) {
    const allRows = [...node.storage.memtable, ...node.storage.sstables.flatMap((s) => s.rows)];
    const merged = mergeRows(allRows, cluster.gcGraceSeconds);
    trees.set(node.id, buildMerkleTree(merged, cluster.tokenRange, TREE_DEPTH));
  }

  const mismatchedRanges = findMismatchedLeafRanges(trees);
  const repairingNodeId = cluster.animation.repairingNodeId;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Anti-entropy repair compares Merkle trees across replica nodes. Mismatched token ranges are
          streamed from the node with the latest data to stale replicas. Use{" "}
          <strong>Write to this node only</strong> in the toolbar to create drift, then run repair.
        </p>
        <button
          onClick={() => dispatch({ type: "RUN_REPAIR" })}
          className="btn-ghost py-1.5 text-xs"
          aria-label="Run repair"
        >
          Run Repair
        </button>
      </div>

      {mismatchedRanges.length > 0 && (
        <div
          className="rounded-lg border p-3 text-[11px]"
          style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border)" }}
        >
          <span style={{ color: "var(--warning)" }}>
            {mismatchedRanges.length} mismatched leaf range{mismatchedRanges.length === 1 ? "" : "s"} detected.
          </span>{" "}
          <span style={{ color: "var(--text-secondary)" }}>Amber borders mark differing leaves.</span>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cluster.nodes.map((node) => (
          <NodeRepairCard
            key={node.id}
            node={node}
            tree={trees.get(node.id)!}
            mismatchedRanges={mismatchedRanges}
            isRepairTarget={repairingNodeId === node.id}
          />
        ))}
      </div>
    </div>
  );
}
