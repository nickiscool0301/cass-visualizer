import type { Cluster, Node } from "../types/cluster";
import type { ClusterAction } from "../state/clusterReducer";

interface StorageViewProps {
  cluster: Cluster;
  dispatch: (action: ClusterAction) => void;
}

function NodeStorageCard({
  node,
  isWriteTarget,
  isFlushed,
  onFlush,
}: {
  node: Node;
  isWriteTarget: boolean;
  isFlushed: boolean;
  onFlush: () => void;
}) {
  const { commitLog, memtable, sstables } = node.storage;
  return (
    <div 
      className={`rounded-lg border p-4 transition-all duration-300 ${isWriteTarget || isFlushed ? "animate-glow" : ""}`} 
      style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border)" }}
    >
      <div className="flex items-center gap-2 border-b pb-2 mb-3" style={{ borderColor: "var(--border-subtle)" }}>
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: node.color }} />
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {node.name}
        </h3>
      </div>

      <div>
        <h4 className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>
          Commit Log ({commitLog.length})
        </h4>
        <ul 
          className="mt-1 max-h-20 space-y-0.5 overflow-y-auto rounded border p-1.5 text-[11px]" 
          style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border)" }}
        >
          {commitLog.slice(0, 5).map((row, i) => (
            <li key={i} className={`${i === 0 && isWriteTarget ? "animate-slide-in" : ""}`} style={{ color: "var(--text-secondary)" }}>
              <span className="font-semibold" style={{ color: "var(--accent)" }}>{row.partitionKey}</span>{" "}
              <span style={{ color: "var(--text-tertiary)" }}>=</span> {row.value}
            </li>
          ))}
          {commitLog.length === 0 && <li style={{ color: "var(--text-tertiary)" }}>Empty</li>}
          {commitLog.length > 5 && <li style={{ color: "var(--text-tertiary)" }}>...and {commitLog.length - 5} more</li>}
        </ul>
      </div>

      <div className="mt-3">
        <h4 className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>
          Memtable ({memtable.length})
        </h4>
        {memtable.length === 0 ? (
          <p 
            className="mt-1 rounded border p-1.5 text-[11px]" 
            style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-tertiary)", borderColor: "var(--border)" }}
          >
            Empty
          </p>
        ) : (
          <div className="mt-1 rounded border p-2" style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border)" }}>
            <table className="w-full text-[11px]">
              <thead>
                <tr style={{ color: "var(--text-tertiary)" }}>
                  <th className="pb-1 text-left font-medium">Key</th>
                  <th className="pb-1 text-left font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {memtable.map((row, i) => (
                  <tr
                    key={i}
                    className={`border-t ${i === 0 && isWriteTarget ? "animate-slide-in" : ""}`}
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <td className="py-1 font-semibold" style={{ color: "var(--accent)" }}>
                      {row.partitionKey}
                    </td>
                    <td className="py-1" style={{ color: "var(--text-secondary)" }}>
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-3">
        <h4 className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>
          SSTables ({sstables.length})
        </h4>
        {sstables.length === 0 ? (
          <p 
            className="mt-1 rounded border p-1.5 text-[11px]" 
            style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-tertiary)", borderColor: "var(--border)" }}
          >
            None
          </p>
        ) : (
          <ul className="mt-1 space-y-1">
            {sstables.map((sstable, i) => (
              <li
                key={sstable.id}
                className={`rounded border p-1.5 text-[11px] ${i === 0 && isFlushed ? "animate-glow" : ""}`}
                style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono-data font-semibold text-slate-500">
                    {sstable.id}
                  </span>
                  <span className="font-medium" style={{ color: "var(--text-secondary)" }}>{sstable.rows.length} rows</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={onFlush}
        disabled={node.storage.memtable.length === 0}
        className="btn-ghost mt-3 w-full py-1.5 text-[11px] disabled:opacity-40"
        aria-label={`Flush memtable on ${node.name}`}
      >
        Flush Memtable
      </button>
    </div>
  );
}

export function StorageView({ cluster, dispatch }: StorageViewProps) {
  const { writeTargetNodeId, flushedNodeId } = cluster.animation;

  return (
    <div className="space-y-4">
      <div>
        <p className="mt-1 max-w-3xl text-[11px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Each node stores its own commit log, memtable, and SSTables. Writes are routed to the partition's
          replica nodes. Use <strong>Flush Memtable</strong> to force memtable data onto disk as an SSTable.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cluster.nodes.map((node) => (
          <NodeStorageCard
            key={node.id}
            node={node}
            isWriteTarget={writeTargetNodeId === node.id}
            isFlushed={flushedNodeId === node.id}
            onFlush={() => dispatch({ type: "FLUSH_MEMTABLE", nodeId: node.id })}
          />
        ))}
      </div>
    </div>
  );
}
