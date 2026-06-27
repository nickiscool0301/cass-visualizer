import { useCluster } from "./hooks/useCluster";
import { TokenRing } from "./components/TokenRing";
import { ControlPanel } from "./components/ControlPanel";
import { DetailsPanel } from "./components/DetailsPanel";
import { EventLog } from "./components/EventLog";

function App() {
  const { cluster, dispatch } = useCluster();

  return (
    <div className="min-h-screen p-4">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold">Cassandra Cluster Visualizer</h1>
        <p className="text-sm text-slate-400">Interactive token-ring topology for learning</p>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <TokenRing
            cluster={cluster}
            onSelectNode={(id) => dispatch({ type: "SELECT_NODE", nodeId: id })}
            highlightedNodeId={cluster.selectedNodeId}
          />
        </section>

        <aside className="space-y-4">
          <ControlPanel cluster={cluster} dispatch={dispatch} />
          <DetailsPanel cluster={cluster} />
          <EventLog events={cluster.events} />
        </aside>
      </main>
    </div>
  );
}

export default App;
