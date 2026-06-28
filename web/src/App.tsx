import { useEffect } from "react";
import { useCluster } from "./hooks/useCluster";
import { TokenRing } from "./components/TokenRing";
import { ControlPanel } from "./components/ControlPanel";
import { DetailsPanel } from "./components/DetailsPanel";
import { EventLog } from "./components/EventLog";
import { StorageView } from "./components/StorageView";
import { WriteSimulator } from "./components/WriteSimulator";

function App() {
  const { cluster, dispatch } = useCluster();

  useEffect(() => {
    if (cluster.animation.joiningNodeId === null) return;
    const timer = setTimeout(() => dispatch({ type: "CLEAR_ANIMATION" }), 1600);
    return () => clearTimeout(timer);
  }, [cluster.animation.joiningNodeId, dispatch]);

  const tabButton = (tab: "topology" | "storage", label: string) => (
    <button
      onClick={() => dispatch({ type: "SET_ACTIVE_TAB", tab })}
      className={`px-5 py-2.5 text-sm font-medium transition-colors ${
        cluster.activeTab === tab
          ? "border-b-2 border-sky-400 text-sky-400"
          : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0b1120] p-4 sm:p-6">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-50">
          Cassandra Cluster Visualizer
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Interactive token-ring topology and storage engine for learning
        </p>
      </header>

      <nav className="mb-6 flex justify-center border-b border-slate-700/60">
        {tabButton("topology", "Topology")}
        {tabButton("storage", "Storage Engine")}
      </nav>

      <main className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
        <section className="panel p-5 lg:col-span-2">
          {cluster.activeTab === "topology" ? (
            <TokenRing
              cluster={cluster}
              onSelectNode={(id) => dispatch({ type: "SELECT_NODE", nodeId: id })}
              highlightedNodeId={cluster.selectedNodeId}
            />
          ) : (
            <StorageView cluster={cluster} />
          )}
        </section>

        <aside className="space-y-5">
          {cluster.activeTab === "storage" && (
            <WriteSimulator cluster={cluster} dispatch={dispatch} />
          )}
          <ControlPanel cluster={cluster} dispatch={dispatch} />
          <DetailsPanel cluster={cluster} />
          <EventLog events={cluster.events} />
        </aside>
      </main>
    </div>
  );
}

export default App;
