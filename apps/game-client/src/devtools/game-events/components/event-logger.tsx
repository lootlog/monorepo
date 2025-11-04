import { useEffect, useState } from "react";
import { Button } from "@lootlog/ui";
import { Trash2, Copy, Download } from "lucide-react";
import { gameEventsStore } from "@/store/game-store/game-events.store";
import type { GameEvent } from "@/types/margonem/game-events/game-event";

export const EventLogger = () => {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<GameEvent | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setEvents([...gameEventsStore.eventHistory]);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const handleClearHistory = () => {
    gameEventsStore.clearHistory();
    setEvents([]);
    setSelectedEvent(null);
  };

  const handleCopyEvent = (event: GameEvent) => {
    navigator.clipboard.writeText(JSON.stringify(event, null, 2));
  };

  const handleExportHistory = () => {
    const data = JSON.stringify(gameEventsStore.eventHistory, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `game-events-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getEventType = (event: GameEvent): string => {
    if (event.f) return "Battle";
    if (event.npcs) return "NPC Spawn";
    if (event.npcs_del) return "NPC Despawn";
    if (event.loot) return "Loot";
    if (event.chat) return "Chat";
    if (event.d) return "Dialog";
    return "Unknown";
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {events.length} events logged
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExportHistory}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button size="sm" variant="outline" onClick={handleClearHistory}>
            <Trash2 className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      <div className="flex gap-4 flex-1 overflow-hidden">
        <div className="w-1/3 border border-border rounded overflow-auto">
          {events.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No events logged yet. Events will appear here as they occur.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {events.map((event, index) => (
                <button
                  key={index}
                  className={`w-full text-left p-3 hover:bg-accent transition-colors ${
                    selectedEvent === event ? "bg-accent" : ""
                  }`}
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {getEventType(event)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      #{index + 1}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    ev: {event.ev} | e: {event.e}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 border border-border rounded overflow-auto">
          {selectedEvent ? (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Event Details</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyEvent(selectedEvent)}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy JSON
                </Button>
              </div>
              <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                {JSON.stringify(selectedEvent, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="p-4 text-sm text-muted-foreground text-center">
              Select an event to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
