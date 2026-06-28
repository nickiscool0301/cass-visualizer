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
  small: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-sky-50 text-sky-700 border-sky-200",
  large: "bg-violet-50 text-violet-700 border-violet-200",
};

function SStableBadge({ sstable, isNew }: { sstable: SSTable; isNew: boolean }) {
  const size = sstableSize(sstable.rows.length);
  return (
    <div
      className={`rounded border px-2 py-1 text-[11px] transition-all ${sizeClasses[size]} ${isNew ? "animate-glow" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono-data opacity-80">L{sstable.level}</span>
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
    <div
      className={`border-b pb-4 transition-all duration-300 ${isCompacted ? "animate-glow" : ""}`}
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: node.color }} />
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {node.name}
          </h3>
        </div>
        <button
          onClick={onCompact}
          disabled={!hasSstables}
          className="btn-ghost py-1.5 text-[11px] disabled:opacity-50"
        >
          Compact
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {levels.length === 0 && <p className="text-[11px]" style={{ color: "var(--text-secondary)" }}>No SSTables yet. Write data in Storage, then flush.</p>}
        {levels.map(([level, sstables]) => (
          <div key={level}>
            <h4 className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>
              Level {level}
            </h4>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {sstables.map((sstable) => (
                <SStableBadge
                  key={sstable.id}
                  sstable={sstable}
                  isNew={isCompacted && level === sstables[0]?.level}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 text-[11px]" style={{ color: "var(--text-secondary)" }}>
        Strategy: <span style={{ color: "var(--text-primary)" }}>{strategy}</span>
      </div>
    </div>
  );
}

export function CompactionView({ cluster, dispatch }: CompactionViewProps) {
  const activeKeyspace = cluster.keyspaces.find((k) => k.id === cluster.activeKeyspaceId);
  const strategy = activeKeyspace?.compactionStrategy ?? "STCS";
  const compactedNodeId = cluster.animation.compactedNodeId;

  return (
    <div className="space-y-4">
      <p className="max-w-3xl text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        SSTables are immutable sorted files. Over time, many small SSTables accumulate. Compaction merges
        them into fewer, larger files to reclaim space and improve read performance.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded border p-3" style={{ borderColor: "var(--border-subtle)" }}>
          <h3 className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>How to test compaction</h3>
          <ol className="mt-1 list-decimal space-y-0.5 pl-3 text-[11px]" style={{ color: "var(--text-secondary)" }}>
            <li>Go to the <strong>Storage</strong> tab.</li>
            <li>Write rows with the Write Simulator.</li>
            <li>Flush memtables manually, or let them auto-flush after 5 rows.</li>
            <li>Return here and click <strong>Compact</strong> on a node.</li>
          </ol>
        </div>

        <div className="rounded border p-3" style={{ borderColor: "var(--border-subtle)" }}>
          <h3 className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
            {strategy === "STCS" ? "Size-Tiered Compaction (STCS)" : "Leveled Compaction (LCS)"}
          </h3>
          <p className="mt-1 text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {strategy === "STCS"
              ? "When 4 SSTables in the same size tier exist, they merge into one larger SSTable at the next tier."
              : "Level 0 holds freshly flushed SSTables (limit 4). Each higher level allows 2 SSTables; when exceeded, all SSTables in that level merge and move up."}
          </p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
