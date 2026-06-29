import { useEffect, useState } from "react";
import type { Cluster } from "../types/cluster";
import type { ClusterAction } from "../state/clusterReducer";

interface ReadSimulatorProps {
  cluster: Cluster;
  dispatch: React.Dispatch<ClusterAction>;
}

export function ReadSimulator({ cluster, dispatch }: ReadSimulatorProps) {
  const [key, setKey] = useState("");
  const isAnimating = cluster.animation.readCoordinatorNodeId !== null;

  useEffect(() => {
    if (
      cluster.animation.readCoordinatorNodeId === null &&
      cluster.animation.readRepairTargetNodeId === null
    )
      return;

    const timeoutId = setTimeout(() => {
      dispatch({ type: "CLEAR_ANIMATION" });
    }, 1600);

    return () => clearTimeout(timeoutId);
  }, [cluster.animation.readCoordinatorNodeId, cluster.animation.readRepairTargetNodeId, dispatch]);

  const handleRead = () => {
    const trimmedKey = key.trim();
    if (!trimmedKey) return;
    dispatch({ type: "READ", partitionKey: trimmedKey });
  };

  const handleRepair = () => {
    const trimmedKey = key.trim();
    if (!trimmedKey) return;
    dispatch({ type: "EXECUTE_READ_REPAIR", partitionKey: trimmedKey });
  };

  const result = cluster.lastReadResult;
  const coordinator = cluster.nodes.find((n) => n.id === result?.coordinatorId);
  const mismatchNodes = result?.digestMismatches
    .map((id) => cluster.nodes.find((n) => n.id === id)?.name ?? id)
    .join(", ");

  return (
    <div className="border-b pb-4" style={{ borderColor: "var(--border-subtle)" }}>
      <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        Read Simulator
      </h2>

      <div className="mt-2 flex gap-2">
        <input
          type="text"
          placeholder="Partition key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          disabled={isAnimating}
          className="input min-w-0 flex-1 disabled:opacity-50"
        />
        <button
          onClick={handleRead}
          disabled={!key.trim() || isAnimating}
          className="btn-ghost disabled:opacity-40"
        >
          Read
        </button>
      </div>

      {result && result.partitionKey === key.trim() && key.trim() !== "" && (
        <div className="mt-2 space-y-1 text-xs" style={{ color: "var(--text-secondary)" }}>
          <p>
            Coordinator: <span style={{ color: "var(--text-primary)" }}>{coordinator?.name ?? "none"}</span>
          </p>
          <p>
            Returned value:{" "}
            <span style={{ color: "var(--text-primary)" }}>{result.resolvedValue ?? "—"}</span>
          </p>
          <p>
            Digests:{" "}
            <span style={{ color: result.digestMismatches.length === 0 ? "#22c55e" : "#ef4444" }}>
              {result.digestMismatches.length === 0 ? "matched" : "mismatch detected"}
            </span>
          </p>
          {result.digestMismatches.length > 0 && (
            <>
              <p>Mismatched nodes: {mismatchNodes}</p>
              <button
                onClick={handleRepair}
                disabled={!key.trim() || isAnimating}
                className="btn-ghost mt-1 disabled:opacity-40"
              >
                Execute Read Repair
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
