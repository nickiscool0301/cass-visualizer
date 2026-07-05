import { useState } from "react";

type Tab = "topology" | "storage" | "compaction" | "repair" | "lwt";

interface TabGuideProps {
  tab: Tab;
}

const guides: Record<Tab, { title: string; steps: string[]; tips: string[] }> = {
  topology: {
    title: "Topology Tab",
    steps: [
      "Use Add node / Remove to change the cluster size.",
      "Rebalance redistributes token ranges evenly across nodes.",
      "Click a node token to toggle it online or offline (hinted handoffs).",
      "Adjust RF with the slider to see how replicas change.",
    ],
    tips: [
      "Hover over ring segments to see which nodes are replicas for a token range.",
      "Offline nodes are dimmed and trigger hint storage on the next write.",
    ],
  },
  storage: {
    title: "Storage Tab",
    steps: [
      "Enter a partition key and value, then click Write.",
      "Use Delete to write a tombstone, or set TTL to auto-expire a row.",
      "Click Advance TTL to convert expired TTL rows into tombstones.",
      "Flush Memtable to persist in-memory rows into an immutable SSTable.",
      "Click any SSTable to inspect its rows (green = active, red = tombstone).",
      "Use Read Simulator to query a key and trigger read repair if replicas differ.",
    ],
    tips: [
      "Rows turn red when they are tombstones; active TTL rows show a countdown.",
      "Hints appear in the Hints section when a replica is down during a write.",
    ],
  },
  compaction: {
    title: "Compaction Tab",
    steps: [
      "Write data in the Storage tab, then flush memtables.",
      "Switch to Compaction and click Compact on a node.",
      "Watch SSTables merge according to the active strategy (STCS or LCS).",
      "Click an SSTable badge to inspect its merged rows.",
    ],
    tips: [
      "STCS merges tiers of similarly-sized SSTables; LCS levels data by size.",
      "Tombstones older than gc_grace_seconds are purged during compaction.",
    ],
  },
  repair: {
    title: "Repair Tab",
    steps: [
      "Use Write to this node only to simulate a node that missed writes.",
      "Click Run Repair to build Merkle trees and stream missing ranges.",
      "Mismatched leaf ranges are highlighted in the tree visualization.",
    ],
    tips: [
      "Only replicas for the active keyspace RF are compared.",
      "Ranges that cross token-ownership boundaries are skipped to keep replica sets consistent.",
    ],
  },
  lwt: {
    title: "LWT Tab",
    steps: [
      "Enter a partition key and value, then click Transactional Write.",
      "Watch the 4-phase Paxos progress indicator: Prepare → Promise → Propose → Accept → Commit.",
      "Use Simulate Contention to race two clients for the same key.",
    ],
    tips: [
      "LWT requires a majority of live replicas; lower RF makes rejection more likely.",
      "The second contender uses a higher ballot and wins in the contention simulation.",
    ],
  },
};

export function TabGuide({ tab }: TabGuideProps) {
  const [open, setOpen] = useState(false);
  const guide = guides[tab];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold"
        style={{
          backgroundColor: "var(--bg-tertiary)",
          color: "var(--text-secondary)",
        }}
        aria-label={`Open guide for ${guide.title}`}
        title="How to use this tab"
      >
        ?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-16"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={guide.title}
        >
          <div
            className="w-full max-w-md rounded-lg border p-4 shadow-lg"
            style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: "var(--border-subtle)" }}>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {guide.title} Guide
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-[11px]"
                style={{ color: "var(--text-tertiary)" }}
                aria-label="Close guide"
              >
                Close
              </button>
            </div>

            <div className="mt-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>
                How to use
              </h4>
              <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                {guide.steps.map((step, i) => (
                  <li key={i} className="leading-5">
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-3">
              <h4 className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--text-tertiary)" }}>
                Tips
              </h4>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                {guide.tips.map((tip, i) => (
                  <li key={i} className="leading-5">
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
