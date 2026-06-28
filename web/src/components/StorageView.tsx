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
      className={`rounded-lg bg-slate-800 p-4 transition-all duration-300 ${
        isWriteTarget || isFlushed ? "animate-glow" : ""
      }`}
    >
      <h3 className="font-semibold" style={{ color: node.color }}>
        {node.name}
      </h3>

      <div className="mt-2">
        <h4 className="text-xs font-medium uppercase text-slate-400">
          Commit Log ({commitLog.length})
        </h4>
        <ul className="mt-1 max-h-24 overflow-y-auto text-xs">
          {commitLog.slice(0, 5).map((row, i) => (
            <li
              key={i}
              className={`text-slate-300 ${i === 0 && isWriteTarget ? "animate-slide-in" : ""}`}
            >
              {row.partitionKey} = {row.value}
            </li>
          ))}
          {commitLog.length > 5 && (
            <li className="text-slate-500">...and {commitLog.length - 5} more</li>
          )}
        </ul>
      </div>

      <div className="mt-3">
        <h4 className="text-xs font-medium uppercase text-slate-400">
          Memtable ({memtable.length})
        </h4>
        {memtable.length === 0 ? (
          <p className="text-xs text-slate-500">Empty</p>
        ) : (
          <table className="mt-1 w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="pb-1">Key</th>
                <th className="pb-1">Value</th>
              </tr>
            </thead>
            <tbody>
              {memtable.map((row, i) => (
                <tr
                  key={i}
                  className={`border-t border-slate-700 ${i === 0 && isWriteTarget ? "animate-slide-in" : ""}`}
                >
                  <td className="py-1 text-slate-300">{row.partitionKey}</td>
                  <td className="py-1 text-slate-300">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-3">
        <h4 className="text-xs font-medium uppercase text-slate-400">SSTables ({sstables.length})</h4>
        {sstables.length === 0 ? (
          <p className="text-xs text-slate-500">None</p>
        ) : (
          <ul className="mt-1 space-y-2">
            {sstables.map((sstable, i) => (
              <li
                key={sstable.id}
                className={`rounded bg-slate-700 p-2 text-xs ${i === 0 && isFlushed ? "animate-glow" : ""}`}
              >
                <div className="text-slate-400">{sstable.id}</div>
                <div className="text-slate-300">{sstable.rows.length} rows</div>
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
      <h2 className="text-lg font-semibold">Storage Engine</h2>
      <p className="text-sm text-slate-400">
        Each node stores its own commit log, memtable, and SSTables. Writes are routed to the
        partition's replica nodes.
      </p>

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
