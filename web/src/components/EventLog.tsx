import type { ClusterEvent } from "../types/cluster";

interface EventLogProps {
  events: ClusterEvent[];
}

export function EventLog({ events }: EventLogProps) {
  return (
    <div className="panel p-5">
      <h2 className="text-lg font-semibold text-slate-50">Event Log</h2>
      <ul className="mt-4 max-h-52 space-y-2 overflow-y-auto text-sm">
        {events.map((event) => (
          <li key={event.id} className="flex gap-3 text-slate-300">
            <span className="shrink-0 text-xs text-slate-500">
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
            <span className="text-sm">{event.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
