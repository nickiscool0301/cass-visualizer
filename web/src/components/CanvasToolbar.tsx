import { useEffect, useState } from "react";
import type { Cluster, CompactionStrategy } from "../types/cluster";
import type { ClusterAction } from "../state/clusterReducer";

interface CanvasToolbarProps {
  cluster: Cluster;
  dispatch: React.Dispatch<ClusterAction>;
}

const titles: Record<CanvasToolbarProps["cluster"]["activeTab"], string> = {
  topology: "Topology",
  storage: "Storage Engine",
  compaction: "Compaction",
  repair: "Anti-Entropy Repair",
  lwt: "Lightweight Transactions",
  knowledge: "Knowledge Base",
};

export function CanvasToolbar({ cluster, dispatch }: CanvasToolbarProps) {
  const [newKeyspaceName, setNewKeyspaceName] = useState("");
  const [newKeyspaceRf, setNewKeyspaceRf] = useState(1);
  const [newCompactionStrategy, setNewCompactionStrategy] = useState<CompactionStrategy>("STCS");
  const [targetNodeId, setTargetNodeId] = useState(cluster.nodes[0]?.id ?? "");
  const [directKey, setDirectKey] = useState("");
  const [directValue, setDirectValue] = useState("");

  useEffect(() => {
    if (targetNodeId && !cluster.nodes.some((n) => n.id === targetNodeId)) {
      setTargetNodeId(cluster.nodes[0]?.id ?? "");
    }
  }, [cluster.nodes, targetNodeId]);

  const activeKeyspace = cluster.keyspaces.find((k) => k.id === cluster.activeKeyspaceId);
  const trimmedName = newKeyspaceName.trim();
  const duplicateName = trimmedName !== "" && cluster.keyspaces.some((k) => k.name === trimmedName);

  const subtitle = activeKeyspace
    ? `${cluster.nodes.length} nodes · RF ${activeKeyspace.replicationFactor} · ${activeKeyspace.compactionStrategy}`
    : `${cluster.nodes.length} nodes`;

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-3" style={{ borderColor: "var(--border-subtle)" }}>
      <div>
        <h1 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          {titles[cluster.activeTab]}
        </h1>
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {subtitle}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        {cluster.activeTab !== "knowledge" && (
          <div className="flex items-center gap-2">
            <button onClick={() => dispatch({ type: "ADD_NODE" })} className="btn-ghost py-1.5 text-xs">
              Add node
            </button>
            <button onClick={() => dispatch({ type: "REBALANCE_TOKENS" })} className="btn-ghost py-1.5 text-xs">
              Rebalance
            </button>
            <button onClick={() => dispatch({ type: "RESET_CLUSTER" })} className="btn-ghost py-1.5 text-xs">
              Reset
            </button>
            <button
              onClick={() => {
                if (cluster.selectedNodeId) {
                  dispatch({ type: "REMOVE_NODE", nodeId: cluster.selectedNodeId });
                }
              }}
              disabled={!cluster.selectedNodeId || cluster.nodes.length <= 1}
              className="btn-ghost py-1.5 text-xs disabled:opacity-40"
            >
              Remove
            </button>
            <button
              onClick={() => {
                if (cluster.selectedNodeId) {
                  dispatch({ type: "BRING_NODE_ONLINE", nodeId: cluster.selectedNodeId });
                }
              }}
              disabled={
                !cluster.selectedNodeId ||
                cluster.nodes.find((n) => n.id === cluster.selectedNodeId)?.status !== "down"
              }
              className="btn-ghost py-1.5 text-xs disabled:opacity-40"
            >
              Bring online & replay hints
            </button>
          </div>
        )}

        {cluster.activeTab !== "knowledge" && (
          <div className="flex items-center gap-2">
            <select
              value={cluster.activeKeyspaceId ?? ""}
              onChange={(e) => dispatch({ type: "SET_ACTIVE_KEYSPACE", keyspaceId: e.target.value })}
              className="input py-1.5 text-xs"
            >
              {cluster.keyspaces.map((ks) => (
                <option key={ks.id} value={ks.id}>
                  {ks.name} (RF={ks.replicationFactor})
                </option>
              ))}
            </select>

            {activeKeyspace && (
              <>
                <div className="flex items-center gap-2">
                  <label style={{ color: "var(--text-tertiary)" }}>RF</label>
                  <input
                    type="range"
                    min={0}
                    max={cluster.nodes.length}
                    value={activeKeyspace.replicationFactor}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_REPLICATION_FACTOR",
                        keyspaceId: activeKeyspace.id,
                        replicationFactor: Number(e.target.value),
                      })
                    }
                    className="w-20"
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <span className="w-4" style={{ color: "var(--text-secondary)" }}>
                    {activeKeyspace.replicationFactor}
                  </span>
                </div>

                <select
                  value={activeKeyspace.compactionStrategy}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_COMPACTION_STRATEGY",
                      keyspaceId: activeKeyspace.id,
                      strategy: e.target.value as CompactionStrategy,
                    })
                  }
                  className="input py-1.5 text-xs"
                >
                  <option value="STCS">STCS</option>
                  <option value="LCS">LCS</option>
                </select>
              </>
            )}
          </div>
        )}

        {cluster.activeTab !== "knowledge" && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="New keyspace"
              value={newKeyspaceName}
              onChange={(e) => setNewKeyspaceName(e.target.value)}
              className="input w-28 py-1.5 text-xs"
            />
            <input
              type="number"
              min={0}
              max={cluster.nodes.length}
              value={newKeyspaceRf}
              onChange={(e) => setNewKeyspaceRf(Number(e.target.value))}
              className="input w-14 py-1.5 text-xs"
            />
            <select
              value={newCompactionStrategy}
              onChange={(e) => setNewCompactionStrategy(e.target.value as CompactionStrategy)}
              className="input py-1.5 text-xs"
            >
              <option value="STCS">STCS</option>
              <option value="LCS">LCS</option>
            </select>
            <button
              onClick={() => {
                if (!trimmedName) return;
                dispatch({
                  type: "ADD_KEYSPACE",
                  name: trimmedName,
                  replicationFactor: newKeyspaceRf,
                  compactionStrategy: newCompactionStrategy,
                });
                setNewKeyspaceName("");
                setNewKeyspaceRf(1);
                setNewCompactionStrategy("STCS");
              }}
              className="btn-ghost py-1.5 text-xs"
            >
              Add
            </button>
            {duplicateName && <span style={{ color: "var(--warning)" }}>Name exists</span>}
          </div>
        )}

        {cluster.activeTab === "repair" && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Key"
              value={directKey}
              onChange={(e) => setDirectKey(e.target.value)}
              className="input w-28 py-1.5 text-xs"
            />
            <input
              type="text"
              placeholder="Value"
              value={directValue}
              onChange={(e) => setDirectValue(e.target.value)}
              className="input w-28 py-1.5 text-xs"
            />
            <select
              value={targetNodeId}
              onChange={(e) => setTargetNodeId(e.target.value)}
              className="input py-1.5 text-xs"
            >
              {cluster.nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                const trimmedKey = directKey.trim();
                const trimmedValue = directValue.trim();
                if (!trimmedKey || !trimmedValue || !targetNodeId) return;
                dispatch({
                  type: "WRITE_TO_NODE",
                  nodeId: targetNodeId,
                  partitionKey: trimmedKey,
                  value: trimmedValue,
                });
                setDirectKey("");
                setDirectValue("");
              }}
              disabled={!directKey.trim() || !directValue.trim() || !targetNodeId}
              className="btn-ghost py-1.5 text-xs disabled:opacity-40"
            >
              Write to this node only
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
