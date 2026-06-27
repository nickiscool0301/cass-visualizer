import { useState } from "react";
import type { Cluster } from "../types/cluster";
import type { ClusterAction } from "../state/clusterReducer";

interface WriteSimulatorProps {
  cluster: Cluster;
  dispatch: React.Dispatch<ClusterAction>;
}

export function WriteSimulator({ cluster, dispatch }: WriteSimulatorProps) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");

  const handleWrite = () => {
    const trimmedKey = key.trim();
    const trimmedValue = value.trim();
    if (!trimmedKey || !trimmedValue) return;
    dispatch({ type: "WRITE", partitionKey: trimmedKey, value: trimmedValue });
    setKey("");
    setValue("");
  };

  return (
    <div className="rounded-lg bg-slate-800 p-4">
      <h2 className="text-lg font-semibold">Write Simulator</h2>
      <p className="mt-1 text-sm text-slate-400">
        Issue a write and watch it flow to the commit log, memtable, and SSTables.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          placeholder="Partition key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="flex-1 rounded bg-slate-700 px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 rounded bg-slate-700 px-3 py-2 text-sm"
        />
        <button
          onClick={handleWrite}
          disabled={!key.trim() || !value.trim()}
          className="rounded bg-blue-600 px-4 py-2 text-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Write
        </button>
      </div>

      <div className="mt-3 text-xs text-slate-400">
        Active keyspace:{" "}
        {cluster.keyspaces.find((k) => k.id === cluster.activeKeyspaceId)?.name ?? "none"} (RF=
        {cluster.keyspaces.find((k) => k.id === cluster.activeKeyspaceId)?.replicationFactor ?? 0})
      </div>
    </div>
  );
}
