import type { ClusterAction } from "../state/clusterReducer";

type Tab = "topology" | "storage" | "compaction" | "knowledge";

interface SidebarProps {
  activeTab: Tab;
  dispatch: React.Dispatch<ClusterAction>;
}

const items: { tab: Tab; label: string; icon: string }[] = [
  { tab: "topology", label: "Topology", icon: "◎" },
  { tab: "storage", label: "Storage", icon: "◈" },
  { tab: "compaction", label: "Compaction", icon: "▦" },
  { tab: "knowledge", label: "Knowledge", icon: "❖" },
];

export function Sidebar({ activeTab, dispatch }: SidebarProps) {
  return (
    <nav
      className="flex h-full w-14 shrink-0 flex-col gap-1 border-r p-2 sm:w-56"
      style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border)" }}
      aria-label="Main navigation"
    >
      <div className="mb-2 px-2 py-1.5">
        <span className="hidden text-sm font-semibold sm:inline" style={{ color: "var(--text-primary)" }}>
          Cass Viz
        </span>
        <span className="text-sm font-semibold sm:hidden" style={{ color: "var(--text-primary)" }}>
          CV
        </span>
      </div>
      {items.map(({ tab, label, icon }) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            onClick={() => dispatch({ type: "SET_ACTIVE_TAB", tab })}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium transition-colors"
            style={{
              backgroundColor: isActive ? "var(--bg-tertiary)" : "transparent",
              color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
            }}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="inline-flex w-4 justify-center">{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
