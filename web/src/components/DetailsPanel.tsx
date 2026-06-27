import type { Cluster } from "../types/cluster";
import { getNodeOwnedRanges } from "../lib/replicaPlacement";

interface DetailsPanelProps {
  cluster: Cluster;
}

export function DetailsPanel({ cluster }: DetailsPanelProps) {
  const selectedNode = cluster.nodes.find((n) => n.id === cluster.selectedNodeId);
  const activeKeyspace = cluster.keyspaces.find((k) => k.id === cluster.activeKeyspaceId);

  return (
    <div className="rounded-lg bg-slate-800 p-4">
      <h2 className="text-lg font-semibold">Details</h2>
      {selectedNode ? (
        <div className="mt-2 space-y-2 text-sm">
          <div>
            <span className="font-medium">Name:</span> {selectedNode.name}
          </div>
          <div>
            <span className="font-medium">Status:</span>{" "}
            <span className="capitalize">{selectedNode.status}</span>
          </div>
          <div>
            <span className="font-medium">Tokens:</span>{" "}
            {selectedNode.tokens.join(", ")}
          </div>
          <div>
            <span className="font-medium">Owned ranges:</span>
            <ul className="ml-4 list-disc text-slate-300">
              {getNodeOwnedRanges(selectedNode.id, cluster.nodes, cluster.tokenRange).map(
                (range, i) => (
                  <li key={i}>
                    {range.start} → {range.end}
                  </li>
                )
              )}
            </ul>
          </div>
        </div>
      ) : (
        <div className="mt-2 space-y-2 text-sm text-slate-300">
          <div>Cluster: {cluster.name}</div>
          <div>Nodes: {cluster.nodes.length}</div>
          <div>Keyspaces: {cluster.keyspaces.length}</div>
          {activeKeyspace && (
            <div>
              Active keyspace: {activeKeyspace.name} (RF={activeKeyspace.replicationFactor})
            </div>
          )}
          <div className="text-xs text-slate-400">Click a node on the ring to see details.</div>
        </div>
      )}
    </div>
  );
}
