import type { ClusterEvent } from "../types/cluster";

interface EventLogProps {
  events: ClusterEvent[];
}

export function EventLog({ events }: EventLogProps) {
  return (
    <div className="panel flex h-full flex-col p-4">
      <h2 className="text-sm font-semibold text-gray-900">Event Log</h2>
      <ul className="mt-2 flex-1 space-y-1.5 overflow-y-auto text-xs">
        {events.map((event) => (
          <li key={event.id} className="flex gap-2 text-gray-700">
            <span className="shrink-0 text-[10px] text-gray-400">
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
            <span>{event.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
