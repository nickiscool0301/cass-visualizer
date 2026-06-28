import type { Cluster } from "../types/cluster";
import { getNodeOwnedRanges } from "../lib/replicaPlacement";

interface DetailsPanelProps {
  cluster: Cluster;
}

export function DetailsPanel({ cluster }: DetailsPanelProps) {
  const selectedNode = cluster.nodes.find((n) => n.id === cluster.selectedNodeId);
  const activeKeyspace = cluster.keyspaces.find((k) => k.id === cluster.activeKeyspaceId);

  return (
    <div className="panel p-4">
      <h2 className="text-sm font-semibold text-gray-900">Details</h2>
      {selectedNode ? (
        <div className="mt-3 space-y-3 text-xs">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: selectedNode.color }}
            />
            <span className="font-medium text-gray-900">{selectedNode.name}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-gray-700">
            <div>
              <span className="text-[10px] uppercase tracking-wide text-gray-500">Status</span>
              <p className="mt-0.5 capitalize">{selectedNode.status}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wide text-gray-500">Tokens</span>
              <p className="mt-0.5">{selectedNode.tokens.join(", ")}</p>
            </div>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wide text-gray-500">Owned ranges</span>
            <ul className="mt-1 space-y-1 text-gray-700">
              {getNodeOwnedRanges(selectedNode.id, cluster.nodes, cluster.tokenRange).map(
                (range, i) => (
                  <li key={i} className="rounded bg-gray-100 px-2 py-0.5 text-[10px]">
                    {range.start} <span className="text-gray-400">→</span> {range.end}
                  </li>
                )
              )}
            </ul>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2 text-xs text-gray-700">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] uppercase tracking-wide text-gray-500">Cluster</span>
              <p className="mt-0.5">{cluster.name}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wide text-gray-500">Nodes</span>
              <p className="mt-0.5">{cluster.nodes.length}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] uppercase tracking-wide text-gray-500">Keyspaces</span>
              <p className="mt-0.5">{cluster.keyspaces.length}</p>
            </div>
            {activeKeyspace && (
              <div>
                <span className="text-[10px] uppercase tracking-wide text-gray-500">Keyspace</span>
                <p className="mt-0.5">
                  {activeKeyspace.name}{" "}
                  <span className="text-gray-500">(RF={activeKeyspace.replicationFactor})</span>
                </p>
              </div>
            )}
          </div>
          <p className="text-[10px] text-gray-500">Click a node on the ring to see details.</p>
        </div>
      )}
    </div>
  );
}
