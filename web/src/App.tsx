import { useEffect } from "react";
import { useCluster } from "./hooks/useCluster";
import { TokenRing } from "./components/TokenRing";
import { Sidebar } from "./components/Sidebar";
import { CanvasToolbar } from "./components/CanvasToolbar";
import { DetailsPanel } from "./components/DetailsPanel";
import { EventLog } from "./components/EventLog";
import { StorageView } from "./components/StorageView";
import { WriteSimulator } from "./components/WriteSimulator";
import { ReadSimulator } from "./components/ReadSimulator";
import { CompactionView } from "./components/CompactionView";
import { RepairView } from "./components/RepairView";
import { KnowledgeView } from "./components/KnowledgeView";

function App() {
  const { cluster, dispatch } = useCluster();

  useEffect(() => {
    if (
      cluster.animation.joiningNodeId === null &&
      cluster.animation.compactedNodeId === null &&
      cluster.animation.repairingNodeId === null &&
      cluster.animation.readCoordinatorNodeId === null &&
      cluster.animation.readRepairTargetNodeIds.length === 0
    )
      return;
    const timer = setTimeout(() => dispatch({ type: "CLEAR_ANIMATION" }), 1600);
    return () => clearTimeout(timer);
  }, [
    cluster.animation.joiningNodeId,
    cluster.animation.compactedNodeId,
    cluster.animation.repairingNodeId,
    cluster.animation.readCoordinatorNodeId,
    cluster.animation.readRepairTargetNodeIds,
    dispatch,
  ]);

  return (
    <div className="flex h-screen overflow-hidden text-sm" style={{ backgroundColor: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <Sidebar activeTab={cluster.activeTab} dispatch={dispatch} />

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-auto p-4 sm:p-5">
          <CanvasToolbar cluster={cluster} dispatch={dispatch} />

          <section className="mt-4 min-h-0 flex-1">
            {cluster.activeTab === "topology" && (
              <TokenRing
                cluster={cluster}
                onSelectNode={(id) => dispatch({ type: "SELECT_NODE", nodeId: id })}
                highlightedNodeId={cluster.selectedNodeId}
              />
            )}
            {cluster.activeTab === "storage" && <StorageView cluster={cluster} dispatch={dispatch} />}
            {cluster.activeTab === "compaction" && <CompactionView cluster={cluster} dispatch={dispatch} />}
            {cluster.activeTab === "repair" && <RepairView cluster={cluster} dispatch={dispatch} />}
            {cluster.activeTab === "knowledge" && <KnowledgeView />}
          </section>
        </div>
      </main>

      <aside
        className="hidden w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l p-4 xl:flex"
        style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border)" }}
      >
        {cluster.activeTab === "storage" && (
          <>
            <WriteSimulator cluster={cluster} dispatch={dispatch} />
            <ReadSimulator cluster={cluster} dispatch={dispatch} />
          </>
        )}
        <DetailsPanel cluster={cluster} />
        <div className="min-h-0 flex-1 overflow-hidden">
          <EventLog events={cluster.events} />
        </div>
      </aside>
    </div>
  );
}

export default App;
