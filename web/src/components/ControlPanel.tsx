import { useState } from "react";
import type { Cluster } from "../types/cluster";
import type { ClusterAction } from "../state/clusterReducer";

interface ControlPanelProps {
  cluster: Cluster;
  dispatch: React.Dispatch<ClusterAction>;
}

export function ControlPanel({ cluster, dispatch }: ControlPanelProps) {
  const [newKeyspaceName, setNewKeyspaceName] = useState("");
  const [newKeyspaceRf, setNewKeyspaceRf] = useState(1);

  const activeKeyspace = cluster.keyspaces.find((k) => k.id === cluster.activeKeyspaceId);

  return (
    <div className="space-y-4 rounded-lg bg-slate-800 p-4">
      <h2 className="text-lg font-semibold">Controls</h2>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => dispatch({ type: "ADD_NODE" })}
          className="rounded bg-blue-600 px-3 py-1 text-sm hover:bg-blue-500"
        >
          Add Node
        </button>
        <button
          onClick={() => dispatch({ type: "REBALANCE_TOKENS" })}
          className="rounded bg-emerald-600 px-3 py-1 text-sm hover:bg-emerald-500"
        >
          Rebalance Tokens
        </button>
        <button
          onClick={() => dispatch({ type: "RESET_CLUSTER" })}
          className="rounded bg-slate-600 px-3 py-1 text-sm hover:bg-slate-500"
        >
          Reset Cluster
        </button>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-medium text-slate-300">Active Keyspace</h3>
        <select
          value={cluster.activeKeyspaceId ?? ""}
          onChange={(e) => dispatch({ type: "SET_ACTIVE_KEYSPACE", keyspaceId: e.target.value })}
          className="w-full rounded bg-slate-700 px-2 py-1 text-sm"
        >
          {cluster.keyspaces.map((ks) => (
            <option key={ks.id} value={ks.id}>
              {ks.name} (RF={ks.replicationFactor})
            </option>
          ))}
        </select>
      </div>

      {activeKeyspace && (
        <div>
          <label className="mb-1 block text-sm text-slate-300">
            Replication Factor (max {cluster.nodes.length})
          </label>
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
            className="w-full"
          />
          <div className="text-right text-sm">{activeKeyspace.replicationFactor}</div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-medium text-slate-300">New Keyspace</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="name"
            value={newKeyspaceName}
            onChange={(e) => setNewKeyspaceName(e.target.value)}
            className="flex-1 rounded bg-slate-700 px-2 py-1 text-sm"
          />
          <input
            type="number"
            min={0}
            max={cluster.nodes.length}
            value={newKeyspaceRf}
            onChange={(e) => setNewKeyspaceRf(Number(e.target.value))}
            className="w-16 rounded bg-slate-700 px-2 py-1 text-sm"
          />
          <button
            onClick={() => {
              if (!newKeyspaceName.trim()) return;
              dispatch({
                type: "ADD_KEYSPACE",
                name: newKeyspaceName.trim(),
                replicationFactor: newKeyspaceRf,
              });
              setNewKeyspaceName("");
              setNewKeyspaceRf(1);
            }}
            className="rounded bg-blue-600 px-3 py-1 text-sm hover:bg-blue-500"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
