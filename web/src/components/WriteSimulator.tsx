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
  const [showPacket, setShowPacket] = useState(false);
  const isAnimating = cluster.animation.writeTargetNodeId !== null;

  useEffect(() => {
    if (!isAnimating) return;
    setShowPacket(true);
    const t1 = setTimeout(() => setShowPacket(false), 800);
    const t2 = setTimeout(() => dispatch({ type: "CLEAR_ANIMATION" }), 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isAnimating, dispatch]);

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
    <div className="panel relative overflow-hidden p-5">
      <h2 className="text-lg font-semibold text-slate-50">Write Simulator</h2>
      <p className="mt-1 text-sm text-slate-400">
        Issue a write and watch it flow to the commit log, memtable, and SSTables.
      </p>

      <div className="relative mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
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
          className="btn-primary"
        >
          Write
        </button>
        {showPacket && (
          <div className="animate-packet absolute right-8 top-1/2 h-3 w-3 rounded-full bg-sky-400 shadow-lg shadow-sky-400/50" />
        )}
      </div>

      <div className="mt-3 text-xs text-slate-400">
        Active keyspace:{" "}
        <span className="text-slate-200">
          {activeKeyspace?.name ?? "none"} (RF={activeKeyspace?.replicationFactor ?? 0})
        </span>
        {targetNode && (
          <span className="ml-2 font-medium text-sky-400">→ {targetNode.name}</span>
        )}
      </div>
    </div>
  );
}
