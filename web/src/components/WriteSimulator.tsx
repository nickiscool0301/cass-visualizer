import { useEffect, useState } from "react";
import type { Cluster } from "../types/cluster";
import type { ClusterAction } from "../state/clusterReducer";

interface WriteSimulatorProps {
  cluster: Cluster;
  dispatch: React.Dispatch<ClusterAction>;
}

export function WriteSimulator({ cluster, dispatch }: WriteSimulatorProps) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const isAnimating = cluster.animation.writeTargetNodeId !== null;

  useEffect(() => {
    if (cluster.animation.writeTargetNodeId === null) return;

    const timeoutId = setTimeout(() => {
      dispatch({ type: "CLEAR_ANIMATION" });
    }, 1600);

    return () => clearTimeout(timeoutId);
  }, [cluster.animation.writeTargetNodeId, dispatch]);

  const handleWrite = () => {
    const trimmedKey = key.trim();
    const trimmedValue = value.trim();
    if (!trimmedKey || !trimmedValue) return;
    dispatch({ type: "WRITE", partitionKey: trimmedKey, value: trimmedValue });
    setKey("");
    setValue("");
  };

  const targetNode = cluster.nodes.find((n) => n.id === cluster.animation.writeTargetNodeId);
  const activeKeyspace = cluster.keyspaces.find((k) => k.id === cluster.activeKeyspaceId);

  return (
    <div className="border-b pb-4" style={{ borderColor: "var(--border-subtle)" }}>
      <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        Write Simulator
      </h2>

      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          type="text"
          placeholder="Partition key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          disabled={isAnimating}
          className="input min-w-0 disabled:opacity-50"
        />
        <input
          type="text"
          placeholder="Value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={isAnimating}
          className="input min-w-0 disabled:opacity-50"
        />
        <button
          onClick={handleWrite}
          disabled={!key.trim() || !value.trim() || isAnimating}
          className="btn-ghost disabled:opacity-40"
        >
          Write
        </button>
      </div>

      <div className="mt-2 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
        Active keyspace:{" "}
        <span style={{ color: "var(--text-primary)" }}>
          {activeKeyspace?.name ?? "none"} (RF={activeKeyspace?.replicationFactor ?? 0})
        </span>
        {targetNode && <span style={{ color: "var(--accent)" }}> → {targetNode.name}</span>}
      </div>
    </div>
  );
}
