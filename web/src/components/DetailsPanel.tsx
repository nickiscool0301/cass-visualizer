import type { Cluster } from "../types/cluster";
import { getNodeOwnedRanges } from "../lib/replicaPlacement";

interface DetailsPanelProps {
  cluster: Cluster;
}

export function DetailsPanel({ cluster }: DetailsPanelProps) {
  const selectedNode = cluster.nodes.find((n) => n.id === cluster.selectedNodeId);
  const activeKeyspace = cluster.keyspaces.find((k) => k.id === cluster.activeKeyspaceId);

  return (
    <div className="panel p-5">
      <h2 className="text-lg font-semibold text-slate-50">Details</h2>
      {selectedNode ? (
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: selectedNode.color }}
            />
            <span className="font-medium text-slate-200">{selectedNode.name}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-slate-300">
            <div>
              <span className="text-xs uppercase tracking-wide text-slate-500">Status</span>
              <p className="mt-0.5 capitalize">{selectedNode.status}</p>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wide text-slate-500">Tokens</span>
              <p className="mt-0.5">{selectedNode.tokens.join(", ")}</p>
            </div>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide text-slate-500">Owned ranges</span>
            <ul className="mt-1.5 space-y-1 text-slate-300">
              {getNodeOwnedRanges(selectedNode.id, cluster.nodes, cluster.tokenRange).map(
                (range, i) => (
                  <li key={i} className="rounded bg-slate-800/60 px-2 py-1 text-xs">
                    {range.start} <span className="text-slate-500">→</span> {range.end}
                  </li>
                )
              )}
            </ul>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3 text-sm text-slate-300">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-xs uppercase tracking-wide text-slate-500">Cluster</span>
              <p className="mt-0.5">{cluster.name}</p>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wide text-slate-500">Nodes</span>
              <p className="mt-0.5">{cluster.nodes.length}</p>
            </div>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide text-slate-500">Keyspaces</span>
            <p className="mt-0.5">{cluster.keyspaces.length}</p>
          </div>
          {activeKeyspace && (
            <div>
              <span className="text-xs uppercase tracking-wide text-slate-500">Active keyspace</span>
              <p className="mt-0.5">
                {activeKeyspace.name} <span className="text-slate-500">(RF={activeKeyspace.replicationFactor})</span>
              </p>
            </div>
          )}
          <p className="text-xs text-slate-500">Click a node on the ring to see details.</p>
        </div>
      )}
    </div>
  );
}
