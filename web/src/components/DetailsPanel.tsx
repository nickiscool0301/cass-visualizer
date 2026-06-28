import type { Cluster } from "../types/cluster";
import { getNodeOwnedRanges } from "../lib/replicaPlacement";

interface DetailsPanelProps {
  cluster: Cluster;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>
      {children}
    </span>
  );
}

export function DetailsPanel({ cluster }: DetailsPanelProps) {
  const selectedNode = cluster.nodes.find((n) => n.id === cluster.selectedNodeId);
  const activeKeyspace = cluster.keyspaces.find((k) => k.id === cluster.activeKeyspaceId);

  return (
    <div className="border-b pb-4" style={{ borderColor: "var(--border-subtle)" }}>
      <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Details</h2>
      {selectedNode ? (
        <div className="mt-3 space-y-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selectedNode.color }} />
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>{selectedNode.name}</span>
          </div>
          <div className="grid grid-cols-2 gap-2" style={{ color: "var(--text-secondary)" }}>
            <div>
              <Label>Status</Label>
              <p className="mt-0.5 capitalize">{selectedNode.status}</p>
            </div>
            <div>
              <Label>Tokens</Label>
              <p className="mt-0.5">{selectedNode.tokens.join(", ")}</p>
            </div>
          </div>
          <div>
            <Label>Owned ranges</Label>
            <ul className="mt-1 space-y-1" style={{ color: "var(--text-secondary)" }}>
              {getNodeOwnedRanges(selectedNode.id, cluster.nodes, cluster.tokenRange).map((range, i) => (
                <li key={i} className="rounded border px-2 py-0.5 text-[10px]" style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--bg-primary)" }}>
                  {range.start} <span style={{ color: "var(--text-tertiary)" }}>→</span> {range.end}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2 text-xs" style={{ color: "var(--text-secondary)" }}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Cluster</Label>
              <p className="mt-0.5">{cluster.name}</p>
            </div>
            <div>
              <Label>Nodes</Label>
              <p className="mt-0.5">{cluster.nodes.length}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Keyspaces</Label>
              <p className="mt-0.5">{cluster.keyspaces.length}</p>
            </div>
            {activeKeyspace && (
              <div>
                <Label>Keyspace</Label>
                <p className="mt-0.5">
                  {activeKeyspace.name}{" "}
                  <span style={{ color: "var(--text-tertiary)" }}>(RF={activeKeyspace.replicationFactor})</span>
                </p>
              </div>
            )}
          </div>
          <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>Click a node on the ring to see details.</p>
        </div>
      )}
    </div>
  );
}
