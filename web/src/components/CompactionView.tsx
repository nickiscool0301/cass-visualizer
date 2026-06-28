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
  onCompact,
}: {
  node: Node;
  strategy: string;
  onCompact: () => void;
}) {
  const byLevel = new Map<number, SSTable[]>();
  for (const sstable of node.storage.sstables) {
    const list = byLevel.get(sstable.level) ?? [];
    list.push(sstable);
    byLevel.set(sstable.level, list);
  }
  const levels = Array.from(byLevel.entries()).sort((a, b) => a[0] - b[0]);

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: node.color }} />
          <h3 className="font-semibold text-slate-50">{node.name}</h3>
        </div>
        <button onClick={onCompact} className="btn-secondary text-xs">
          Compact
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {levels.length === 0 && (
          <p className="text-sm text-slate-500">No SSTables to compact.</p>
        )}
        {levels.map(([level, sstables]) => (
          <div key={level}>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Level {level}
            </h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {sstables.map((sstable) => (
                <SStableBadge key={sstable.id} sstable={sstable} isNew={false} />
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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-50">Compaction</h2>
        <p className="mt-1 text-sm text-slate-400">
          {strategy === "STCS"
            ? "Size-Tiered Compaction: when 4 SSTables in the same size tier exist, they merge into one larger SSTable."
            : "Leveled Compaction: SSTables are organized into levels. When a level exceeds its limit, all SSTables in it merge and move to the next level."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cluster.nodes.map((node) => (
          <NodeCompactionCard
            key={node.id}
            node={node}
            strategy={strategy}
            onCompact={() => dispatch({ type: "COMPACT", nodeId: node.id })}
          />
        ))}
      </div>
    </div>
  );
}
