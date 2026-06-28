import type { Cluster, Node, SSTable } from "../types/cluster";

interface CompactionViewProps {
  cluster: Cluster;
  dispatch: React.Dispatch<{ type: "COMPACT"; nodeId: string }>;
}

type SizeTier = "small" | "medium" | "large";

function sstableSize(rows: number): SizeTier {
  if (rows < 5) return "small";
  if (rows < 15) return "medium";
  return "large";
}

const sizeClasses: Record<SizeTier, string> = {
  small: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  medium: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  large: "bg-violet-500/15 text-violet-400 border-violet-500/30",
};

function SStableBadge({ sstable, isNew }: { sstable: SSTable; isNew: boolean }) {
  const size = sstableSize(sstable.rows.length);
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-xs transition-all ${sizeClasses[size]} ${
        isNew ? "animate-glow" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono opacity-80">L{sstable.level}</span>
        <span className="font-semibold">{sstable.rows.length} rows</span>
      </div>
    </div>
  );
}

function NodeCompactionCard({
  node,
  strategy,
  isCompacted,
  onCompact,
}: {
  node: Node;
  strategy: string;
  isCompacted: boolean;
  onCompact: () => void;
}) {
  const byLevel = new Map<number, SSTable[]>();
  for (const sstable of node.storage.sstables) {
    const list = byLevel.get(sstable.level) ?? [];
    list.push(sstable);
    byLevel.set(sstable.level, list);
  }
  const levels = Array.from(byLevel.entries()).sort((a, b) => a[0] - b[0]);
  const hasSstables = node.storage.sstables.length > 0;

  return (
    <div className={`panel p-5 transition-all duration-300 ${isCompacted ? "animate-glow" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: node.color }} />
          <h3 className="font-semibold text-slate-50">{node.name}</h3>
        </div>
        <button
          onClick={onCompact}
          disabled={!hasSstables}
          className="btn-secondary text-xs disabled:cursor-not-allowed disabled:opacity-50"
        >
          Compact
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {levels.length === 0 && (
          <p className="text-sm text-slate-500">No SSTables yet. Write some data in Storage Engine first.</p>
        )}
        {levels.map(([level, sstables]) => (
          <div key={level}>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Level {level}
            </h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {sstables.map((sstable) => (
                <SStableBadge key={sstable.id} sstable={sstable} isNew={isCompacted && level === sstables[0]?.level} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs text-slate-500">
        Strategy: <span className="text-slate-300">{strategy}</span>
      </div>
    </div>
  );
}

export function CompactionView({ cluster, dispatch }: CompactionViewProps) {
  const activeKeyspace = cluster.keyspaces.find((k) => k.id === cluster.activeKeyspaceId);
  const strategy = activeKeyspace?.compactionStrategy ?? "STCS";
  const compactedNodeId = cluster.animation.compactedNodeId;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-50">Compaction</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-400">
          SSTables are immutable sorted files. Over time, many small SSTables accumulate. Compaction
          merges them into fewer, larger files to reclaim space and improve read performance.
        </p>
      </div>

      <div className="panel p-5">
        <h3 className="text-sm font-semibold text-slate-200">How to test compaction</h3>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-slate-400">
          <li>Go to the <strong>Storage Engine</strong> tab.</li>
          <li>Write several rows (e.g., 20+) using the Write Simulator.</li>
          <li>Watch memtables flush into SSTables automatically.</li>
          <li>Return here and click <strong>Compact</strong> on a node with SSTables.</li>
        </ol>
      </div>

      <div className="panel p-5">
        <h3 className="text-sm font-semibold text-slate-200">
          {strategy === "STCS" ? "Size-Tiered Compaction (STCS)" : "Leveled Compaction (LCS)"}
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          {strategy === "STCS"
            ? "When 4 SSTables in the same size tier exist, they merge into one larger SSTable at the next tier."
            : "Level 0 holds freshly flushed SSTables (limit 4). Each higher level allows 2 SSTables; when exceeded, all SSTables in that level merge and move up."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cluster.nodes.map((node) => (
          <NodeCompactionCard
            key={node.id}
            node={node}
            strategy={strategy}
            isCompacted={compactedNodeId === node.id}
            onCompact={() => dispatch({ type: "COMPACT", nodeId: node.id })}
          />
        ))}
      </div>
    </div>
  );
}
