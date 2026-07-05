import type { ClusterAction } from "../state/clusterReducer";

type Tab = "topology" | "storage" | "compaction" | "repair" | "lwt" | "knowledge";

interface SidebarProps {
  activeTab: Tab;
  dispatch: React.Dispatch<ClusterAction>;
}

const items: { tab: Tab; label: string; icon: React.ReactNode }[] = [
  {
    tab: "topology",
    label: "Topology",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="4" r="1" fill="currentColor" />
        <circle cx="20" cy="12" r="1" fill="currentColor" />
        <circle cx="12" cy="20" r="1" fill="currentColor" />
        <circle cx="4" cy="12" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    tab: "storage",
    label: "Storage",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
      </svg>
    ),
  },
  {
    tab: "compaction",
    label: "Compaction",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <rect x="3" y="3" width="18" height="6" rx="1" />
        <rect x="3" y="11" width="18" height="6" rx="1" />
        <path d="M12 18v3" />
        <path d="M9 20h6" />
      </svg>
    ),
  },
  {
    tab: "repair",
    label: "Repair",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    tab: "lwt",
    label: "LWT",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    tab: "knowledge",
    label: "Knowledge",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
      >
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
];

export function Sidebar({ activeTab, dispatch }: SidebarProps) {
  return (
    <nav
      className="flex h-full w-14 shrink-0 flex-col gap-1 border-r p-2 sm:w-56"
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderColor: "var(--border)",
      }}
      aria-label="Main navigation"
    >
      <div className="mb-2 px-2 py-1.5">
        <span
          className="hidden text-sm font-semibold sm:inline"
          style={{ color: "var(--text-primary)" }}
        >
          Cassandra Visualizer
        </span>
        <span
          className="text-sm font-semibold sm:hidden"
          style={{ color: "var(--text-primary)" }}
        >
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
            <span className="inline-flex h-4 w-4 items-center justify-center shrink-0">
              {icon}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
