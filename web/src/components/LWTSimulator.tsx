import { useState } from "react";
import type { Cluster } from "../types/cluster";
import type { ClusterAction } from "../state/clusterReducer";

interface LWTSimulatorProps {
  cluster: Cluster;
  dispatch: React.Dispatch<ClusterAction>;
}

const phases: Array<{ key: "prepare" | "promise" | "propose" | "accept" | "commit"; label: string }> = [
  { key: "prepare", label: "Prepare" },
  { key: "promise", label: "Promise" },
  { key: "propose", label: "Propose" },
  { key: "accept", label: "Accept" },
  { key: "commit", label: "Commit" },
];

export function LWTSimulator({ cluster, dispatch }: LWTSimulatorProps) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [valueA, setValueA] = useState("");
  const [valueB, setValueB] = useState("");

  const activePhase = cluster.animation.paxosPhase;
  const coordinator = cluster.nodes.find((n) => n.id === cluster.animation.paxosCoordinatorNodeId);

  return (
    <div className="space-y-4">
      <div
        className="rounded-lg border p-4"
        style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Lightweight Transaction
        </h2>
        <p className="mt-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>
          Simulates a Paxos round for <code>IF NOT EXISTS</code> inserts. The coordinator prepares a
          ballot, collects promises, proposes a value, collects accepts, and commits.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            type="text"
            placeholder="Partition key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="input min-w-0 text-xs"
          />
          <input
            type="text"
            placeholder="Value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="input min-w-0 text-xs"
          />
          <button
            onClick={() => {
              const trimmedKey = key.trim();
              const trimmedValue = value.trim();
              if (!trimmedKey || !trimmedValue) return;
              dispatch({ type: "LWT_PROPOSE", partitionKey: trimmedKey, value: trimmedValue });
              setKey("");
              setValue("");
            }}
            disabled={!key.trim() || !value.trim()}
            className="btn-ghost disabled:opacity-40 text-xs"
          >
            Transactional Write
          </button>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>
            {phases.map(({ key: phaseKey, label }) => (
              <div key={phaseKey} className="flex flex-1 flex-col items-center gap-1">
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold"
                  style={{
                    backgroundColor:
                      activePhase && phases.findIndex((p) => p.key === activePhase) >=
                        phases.findIndex((p) => p.key === phaseKey)
                        ? "var(--accent)"
                        : "var(--bg-tertiary)",
                    color:
                      activePhase && phases.findIndex((p) => p.key === activePhase) >=
                        phases.findIndex((p) => p.key === phaseKey)
                        ? "#fff"
                        : "var(--text-tertiary)",
                  }}
                >
                  {phases.findIndex((p) => p.key === phaseKey) + 1}
                </span>
                <span>{label}</span>
              </div>
            ))}
          </div>
          {coordinator && (
            <p className="mt-2 text-[11px]" style={{ color: "var(--text-secondary)" }}>
              Coordinator: <span style={{ color: "var(--accent)" }}>{coordinator.name}</span>
            </p>
          )}
        </div>
      </div>

      <div
        className="rounded-lg border p-4"
        style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Contention Simulation
        </h2>
        <p className="mt-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>
          Two clients propose different values for the same key. The second client uses a higher
          ballot and wins.
        </p>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <input
            type="text"
            placeholder="Partition key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="input min-w-0 text-xs"
          />
          <input
            type="text"
            placeholder="Client A value"
            value={valueA}
            onChange={(e) => setValueA(e.target.value)}
            className="input min-w-0 text-xs"
          />
          <input
            type="text"
            placeholder="Client B value"
            value={valueB}
            onChange={(e) => setValueB(e.target.value)}
            className="input min-w-0 text-xs"
          />
          <button
            onClick={() => {
              const trimmedKey = key.trim();
              const trimmedA = valueA.trim();
              const trimmedB = valueB.trim();
              if (!trimmedKey || !trimmedA || !trimmedB) return;
              dispatch({
                type: "LWT_CONTEND",
                partitionKey: trimmedKey,
                valueA: trimmedA,
                valueB: trimmedB,
              });
            }}
            disabled={!key.trim() || !valueA.trim() || !valueB.trim()}
            className="btn-ghost disabled:opacity-40 text-xs"
          >
            Simulate Contention
          </button>
        </div>
      </div>
    </div>
  );
}
