import type { ClusterEvent } from "../types/cluster";

interface EventLogProps {
  events: ClusterEvent[];
}

export function EventLog({ events }: EventLogProps) {
  return (
    <div className="flex h-full flex-col">
      <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Event Log</h2>
      <ul className="mt-2 flex-1 space-y-1.5 overflow-y-auto text-xs">
        {events.map((event) => (
          <li key={event.id} className="flex gap-2" style={{ color: "var(--text-secondary)" }}>
            <span className="shrink-0 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
            <span>{event.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
