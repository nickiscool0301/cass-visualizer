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
  const [ttlSeconds, setTtlSeconds] = useState("");
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

    const ttl = ttlSeconds.trim() === "" ? undefined : Number(ttlSeconds);
    if (ttl !== undefined && (!Number.isFinite(ttl) || ttl <= 0)) return;

    if (ttl !== undefined) {
      dispatch({ type: "WRITE_TTL", partitionKey: trimmedKey, value: trimmedValue, ttlSeconds: ttl });
    } else {
      dispatch({ type: "WRITE", partitionKey: trimmedKey, value: trimmedValue });
    }
    setKey("");
    setValue("");
    setTtlSeconds("");
  };

  const handleDelete = () => {
    const trimmedKey = key.trim();
    if (!trimmedKey) return;
    dispatch({ type: "DELETE", partitionKey: trimmedKey });
    setKey("");
    setValue("");
    setTtlSeconds("");
  };

  const handleTickTTL = () => {
    dispatch({ type: "TICK_TTL" });
  };

  const targetNode = cluster.nodes.find((n) => n.id === cluster.animation.writeTargetNodeId);
  const activeKeyspace = cluster.keyspaces.find((k) => k.id === cluster.activeKeyspaceId);

  const actionTypeLabel: Record<string, string> = {
    write: "Write",
    write_ttl: "TTL Write",
    delete: "Delete",
  };

  return (
    <div className="border-b pb-4" style={{ borderColor: "var(--border-subtle)" }}>
      <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        Write Simulator
      </h2>

      <div className="mt-3 space-y-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={1}
            placeholder="TTL (s)"
            value={ttlSeconds}
            onChange={(e) => setTtlSeconds(e.target.value)}
            disabled={isAnimating}
            className="input w-24 disabled:opacity-50"
          />
          <button
            onClick={handleWrite}
            disabled={!key.trim() || !value.trim() || isAnimating}
            className="btn-ghost disabled:opacity-40"
          >
            Write
          </button>
          <button
            onClick={handleDelete}
            disabled={!key.trim() || isAnimating}
            className="btn-ghost disabled:opacity-40"
          >
            Delete
          </button>
          <button
            onClick={handleTickTTL}
            className="btn-ghost ml-auto text-[11px]"
          >
            Advance TTL
          </button>
        </div>
      </div>

      <div className="mt-2 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
        Active keyspace:{" "}
        <span style={{ color: "var(--text-primary)" }}>
          {activeKeyspace?.name ?? "none"} (RF={activeKeyspace?.replicationFactor ?? 0})
        </span>
        {targetNode && (
          <span style={{ color: "var(--accent)" }}>
            {" "}
            → {actionTypeLabel[cluster.animation.lastWriteAction ?? "write"]} on {targetNode.name}
          </span>
        )}
      </div>
    </div>
  );
}
