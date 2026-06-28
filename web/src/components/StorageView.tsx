import type { Cluster, Node } from "../types/cluster";

interface StorageViewProps {
  cluster: Cluster;
}

function NodeStorageCard({
  node,
  isWriteTarget,
  isFlushed,
}: {
  node: Node;
  isWriteTarget: boolean;
  isFlushed: boolean;
}) {
  const { commitLog, memtable, sstables } = node.storage;
  return (
    <div
      className={`panel p-5 transition-all duration-300 ${
        isWriteTarget || isFlushed ? "animate-glow" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: node.color }} />
        <h3 className="font-semibold text-slate-50">{node.name}</h3>
      </div>

      <div className="mt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Commit Log ({commitLog.length})
        </h4>
        <ul className="mt-2 max-h-24 space-y-1 overflow-y-auto rounded-lg bg-slate-800/50 p-2 text-xs">
          {commitLog.slice(0, 5).map((row, i) => (
            <li
              key={i}
              className={`text-slate-300 ${i === 0 && isWriteTarget ? "animate-slide-in" : ""}`}
            >
              <span className="text-sky-400">{row.partitionKey}</span>{" "}
              <span className="text-slate-500">=</span> {row.value}
            </li>
          ))}
          {commitLog.length === 0 && <li className="text-slate-600">Empty</li>}
          {commitLog.length > 5 && (
            <li className="text-slate-500">...and {commitLog.length - 5} more</li>
          )}
        </ul>
      </div>

      <div className="mt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Memtable ({memtable.length})
        </h4>
        {memtable.length === 0 ? (
          <p className="mt-2 rounded-lg bg-slate-800/50 p-2 text-xs text-slate-600">Empty</p>
        ) : (
          <table className="mt-2 w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="pb-2 font-medium">Key</th>
                <th className="pb-2 font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {memtable.map((row, i) => (
                <tr
                  key={i}
                  className={`border-t border-slate-700/50 ${i === 0 && isWriteTarget ? "animate-slide-in" : ""}`}
                >
                  <td className="py-2 text-sky-400">{row.partitionKey}</td>
                  <td className="py-2 text-slate-300">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          SSTables ({sstables.length})
        </h4>
        {sstables.length === 0 ? (
          <p className="mt-2 rounded-lg bg-slate-800/50 p-2 text-xs text-slate-600">None</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {sstables.map((sstable, i) => (
              <li
                key={sstable.id}
                className={`rounded-lg bg-slate-800/50 p-3 text-xs ${i === 0 && isFlushed ? "animate-glow" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-slate-400">{sstable.id}</span>
                  <span className="text-slate-500">{sstable.rows.length} rows</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function StorageView({ cluster }: StorageViewProps) {
  const selectedNode = cluster.nodes.find((n) => n.id === cluster.selectedNodeId);
  const { writeTargetNodeId, flushedNodeId } = cluster.animation;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-50">Storage Engine</h2>
        <p className="mt-1 text-sm text-slate-400">
          Each node stores its own commit log, memtable, and SSTables. Writes are routed to the
          partition's replica nodes.
        </p>
      </div>

      {selectedNode ? (
        <NodeStorageCard
          node={selectedNode}
          isWriteTarget={writeTargetNodeId === selectedNode.id}
          isFlushed={flushedNodeId === selectedNode.id}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cluster.nodes.map((node) => (
            <NodeStorageCard
              key={node.id}
              node={node}
              isWriteTarget={writeTargetNodeId === node.id}
              isFlushed={flushedNodeId === node.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
