import { useState } from "react";
import type { Cluster, CompactionStrategy } from "../types/cluster";
import type { ClusterAction } from "../state/clusterReducer";

interface ControlPanelProps {
  cluster: Cluster;
  dispatch: React.Dispatch<ClusterAction>;
}

export function ControlPanel({ cluster, dispatch }: ControlPanelProps) {
  const [newKeyspaceName, setNewKeyspaceName] = useState("");
  const [newKeyspaceRf, setNewKeyspaceRf] = useState(1);
  const [newCompactionStrategy, setNewCompactionStrategy] = useState<CompactionStrategy>("STCS");

  const activeKeyspace = cluster.keyspaces.find((k) => k.id === cluster.activeKeyspaceId);

  const trimmedName = newKeyspaceName.trim();
  const duplicateName = trimmedName !== "" && cluster.keyspaces.some((k) => k.name === trimmedName);
  const newRfExceedsNodes = newKeyspaceRf > cluster.nodes.length;
  const activeRfExceedsNodes = activeKeyspace
    ? activeKeyspace.replicationFactor > cluster.nodes.length
    : false;

  return (
    <div className="panel p-5">
      <h2 className="text-lg font-semibold text-slate-50">Controls</h2>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => dispatch({ type: "ADD_NODE" })}
          className="btn-primary"
        >
          Add Node
        </button>
        <button
          onClick={() => dispatch({ type: "REBALANCE_TOKENS" })}
          className="btn-secondary"
        >
          Rebalance
        </button>
        <button
          onClick={() => dispatch({ type: "RESET_CLUSTER" })}
          className="btn-secondary"
        >
          Reset
        </button>
        <button
          onClick={() => {
            if (cluster.selectedNodeId) {
              dispatch({ type: "REMOVE_NODE", nodeId: cluster.selectedNodeId });
            }
          }}
          disabled={!cluster.selectedNodeId || cluster.nodes.length <= 1}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Remove
        </button>
      </div>

      <div className="mt-5">
        <h3 className="mb-2 text-sm font-medium text-slate-300">Active Keyspace</h3>
        <select
          value={cluster.activeKeyspaceId ?? ""}
          onChange={(e) => dispatch({ type: "SET_ACTIVE_KEYSPACE", keyspaceId: e.target.value })}
          className="input w-full"
        >
          {cluster.keyspaces.map((ks) => (
            <option key={ks.id} value={ks.id}>
              {ks.name} (RF={ks.replicationFactor})
            </option>
          ))}
        </select>
      </div>

      {activeKeyspace && (
        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Replication Factor <span className="text-slate-500">(max {cluster.nodes.length})</span>
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
            className="w-full accent-sky-400"
          />
          <div className="mt-1 text-right text-sm font-medium text-sky-400">
            {activeKeyspace.replicationFactor}
          </div>
          {activeRfExceedsNodes && (
            <p className="mt-1 text-xs text-amber-400">
              Warning: RF exceeds the current node count ({cluster.nodes.length}).
            </p>
          )}

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-slate-300">Compaction Strategy</label>
            <select
              value={activeKeyspace.compactionStrategy}
              onChange={(e) =>
                dispatch({
                  type: "SET_COMPACTION_STRATEGY",
                  keyspaceId: activeKeyspace.id,
                  strategy: e.target.value as CompactionStrategy,
                })
              }
              className="input w-full"
            >
              <option value="STCS">Size-Tiered (STCS)</option>
              <option value="LCS">Leveled (LCS)</option>
            </select>
          </div>
        </div>
      )}

      <div className="mt-5">
        <h3 className="mb-2 text-sm font-medium text-slate-300">New Keyspace</h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            placeholder="name"
            value={newKeyspaceName}
            onChange={(e) => setNewKeyspaceName(e.target.value)}
            className="input flex-1"
          />
          <input
            type="number"
            min={0}
            max={cluster.nodes.length}
            value={newKeyspaceRf}
            onChange={(e) => setNewKeyspaceRf(Number(e.target.value))}
            className="input w-16"
          />
          <select
            value={newCompactionStrategy}
            onChange={(e) => setNewCompactionStrategy(e.target.value as CompactionStrategy)}
            className="input"
          >
            <option value="STCS">STCS</option>
            <option value="LCS">LCS</option>
          </select>
          <button
            onClick={() => {
              if (!newKeyspaceName.trim()) return;
              dispatch({
                type: "ADD_KEYSPACE",
                name: newKeyspaceName.trim(),
                replicationFactor: newKeyspaceRf,
                compactionStrategy: newCompactionStrategy,
              });
              setNewKeyspaceName("");
              setNewKeyspaceRf(1);
              setNewCompactionStrategy("STCS");
            }}
            className="btn-primary"
          >
            Add
          </button>
        </div>
        {duplicateName && (
          <p className="mt-2 text-xs text-amber-400">Warning: keyspace name already exists.</p>
        )}
        {newRfExceedsNodes && (
          <p className="mt-2 text-xs text-amber-400">
            Warning: RF exceeds the current node count ({cluster.nodes.length}).
          </p>
        )}
      </div>
    </div>
  );
}
