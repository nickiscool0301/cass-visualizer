import type { ClusterEvent } from "../types/cluster";

interface EventLogProps {
  events: ClusterEvent[];
}

export function EventLog({ events }: EventLogProps) {
  return (
    <div className="rounded-lg bg-slate-800 p-4">
      <h2 className="text-lg font-semibold">Event Log</h2>
      <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm">
        {events.map((event) => (
          <li key={event.id} className="text-slate-300">
            <span className="text-xs text-slate-500">
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>{" "}
            {event.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
