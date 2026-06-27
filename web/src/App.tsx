import { useCluster } from "./hooks/useCluster";
import { TokenRing } from "./components/TokenRing";
import { ControlPanel } from "./components/ControlPanel";
import { DetailsPanel } from "./components/DetailsPanel";
import { EventLog } from "./components/EventLog";
import { StorageView } from "./components/StorageView";
import { WriteSimulator } from "./components/WriteSimulator";

function App() {
  const { cluster, dispatch } = useCluster();

  const tabButton = (tab: "topology" | "storage", label: string) => (
    <button
      onClick={() => dispatch({ type: "SET_ACTIVE_TAB", tab })}
      className={`px-4 py-2 text-sm font-medium ${
        cluster.activeTab === tab
          ? "border-b-2 border-blue-500 text-blue-400"
          : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen p-4">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold">Cassandra Cluster Visualizer</h1>
        <p className="text-sm text-slate-400">Interactive token-ring topology for learning</p>
      </header>

      <nav className="mb-4 flex justify-center border-b border-slate-700">
        {tabButton("topology", "Topology")}
        {tabButton("storage", "Storage Engine")}
      </nav>

      <main className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2">
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

        <aside className="space-y-4">
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
