import type { SSTable, StoredRow } from "../types/cluster";

interface SSTableInspectorProps {
  sstable: SSTable;
  onClose: () => void;
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString();
}

function RowDetails({ row }: { row: StoredRow }) {
  return (
    <>
      <td className="py-1.5 pr-2 font-semibold" style={{ color: "var(--accent)" }}>
        {row.partitionKey}
      </td>
      <td className="py-1.5 pr-2" style={{ color: row.isTombstone ? "#dc2626" : "var(--text-secondary)" }}>
        {row.value}
      </td>
      <td className="py-1.5 pr-2 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
        {row.ttl !== undefined ? `${row.ttl}s` : "—"}
      </td>
      <td className="py-1.5 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
        {formatTimestamp(row.timestamp)}
      </td>
    </>
  );
}

export function SSTableInspector({ sstable, onClose }: SSTableInspectorProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`SSTable ${sstable.id} inspector`}
    >
      <div
        className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-lg border p-4 shadow-lg"
        style={{ backgroundColor: "var(--bg-primary)", borderColor: "var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b pb-2 mb-3" style={{ borderColor: "var(--border-subtle)" }}>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              SSTable Inspector
            </h3>
            <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {sstable.id} · Level {sstable.level} · {sstable.rows.length} rows
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost py-1 px-2 text-[11px]"
            aria-label="Close inspector"
          >
            Close
          </button>
        </div>

        {sstable.rows.length === 0 ? (
          <p className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            This SSTable contains no rows.
          </p>
        ) : (
          <table className="w-full text-[11px]">
            <thead>
              <tr style={{ color: "var(--text-tertiary)" }}>
                <th className="pb-1 text-left font-medium">Key</th>
                <th className="pb-1 text-left font-medium">Value</th>
                <th className="pb-1 text-left font-medium">TTL</th>
                <th className="pb-1 text-left font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {sstable.rows.map((row, i) => (
                <tr
                  key={i}
                  className="border-t"
                  style={{
                    borderColor: "var(--border-subtle)",
                    backgroundColor: row.isTombstone ? "rgba(220, 38, 38, 0.06)" : "rgba(34, 197, 94, 0.06)",
                  }}
                >
                  <RowDetails row={row} />
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-3 flex gap-3 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: "rgba(34, 197, 94, 0.25)" }} />
            Active
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: "rgba(220, 38, 38, 0.25)" }} />
            Tombstone
          </span>
        </div>
      </div>
    </div>
  );
}
