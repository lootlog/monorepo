import { Button } from "@/components/ui/button";
import { gameEventsManager } from "@/lib/game-events-manager";
import type { GameEvent } from "@/types/margonem/game-events/game-event";
import { useState, type FC } from "react";

const createBaseEvent = (): Pick<GameEvent, "d" | "e" | "ev"> => ({
  d: ["", "", ""],
  e: "ok",
  ev: Date.now(),
});

const EVENT_TEMPLATES: Record<string, { label: string; event: GameEvent }> = {
  npcSpawn: {
    label: "NPC Spawn",
    event: {
      ...createBaseEvent(),
      npcs: [
        {
          id: 999999,
          icon: { id: 1 },
          tpl: 1,
          x: 10,
          y: 10,
        },
      ],
    },
  },
  npcDelete: {
    label: "NPC Delete",
    event: {
      ...createBaseEvent(),
      npcs_del: [{ id: 999999 }],
    },
  },
  townChange: {
    label: "Town Change",
    event: {
      ...createBaseEvent(),
      town: {
        id: 123,
        name: "Debug Map",
        mainid: 1,
        bg: "0",
        file: "map.png",
        mode: 1,
        pvp: 0,
        visibility: 1,
        water: "0",
        x: 10,
        y: 10,
      },
    },
  },
  afkOn: {
    label: "AFK On",
    event: {
      ...createBaseEvent(),
      h: { stasis: 1 },
    },
  },
  afkOff: {
    label: "AFK Off",
    event: {
      ...createBaseEvent(),
      h: { stasis: 0 },
    },
  },
  lootFight: {
    label: "Loot (Fight)",
    event: {
      ...createBaseEvent(),
      loot: {
        source: "fight",
        states: { "123456": 1 },
      },
    },
  },
  lootDialog: {
    label: "Loot (Dialog)",
    event: {
      ...createBaseEvent(),
      loot: {
        source: "dialog",
        states: { "123456": 1 },
      },
    },
  },
};

type LogEntry = {
  id: number;
  timestamp: Date;
  eventType: string;
  success: boolean;
};

export const DebugTab: FC = () => {
  const [rawJson, setRawJson] = useState<string>(
    JSON.stringify(EVENT_TEMPLATES.npcSpawn.event, null, 2),
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [eventLog, setEventLog] = useState<LogEntry[]>([]);
  const zoomFactor = window.getZoomFactor ? window.getZoomFactor() : null;

  const addLogEntry = (eventType: string, success: boolean) => {
    setEventLog((prev) => [
      { id: Date.now(), timestamp: new Date(), eventType, success },
      ...prev.slice(0, 19),
    ]);
  };

  const triggerEvent = (event: GameEvent, label: string) => {
    const success = gameEventsManager.triggerManualEvent(event);
    addLogEntry(label, success);
  };

  const triggerFromJson = () => {
    try {
      const event = JSON.parse(rawJson) as GameEvent;
      setJsonError(null);
      const success = gameEventsManager.triggerManualEvent(event);
      addLogEntry("Custom JSON", success);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "Invalid JSON");
    }
  };

  const loadTemplate = (templateKey: string) => {
    const template = EVENT_TEMPLATES[templateKey];
    if (template) {
      setRawJson(JSON.stringify(template.event, null, 2));
      setJsonError(null);
    }
  };

  return (
    <div className="ll:flex ll:flex-col ll:gap-4 ll:p-4">
      <div>
        <h3 className="ll:text-sm ll:font-semibold ll:mb-2">
          Event Templates
        </h3>
        <div className="ll:flex ll:flex-wrap ll:gap-1">
          {Object.entries(EVENT_TEMPLATES).map(([key, { label, event }]) => (
            <Button
              key={key}
              onClick={() => triggerEvent(event, label)}
              className="ll:px-2"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="ll:text-sm ll:font-semibold ll:mb-2">Raw JSON Event</h3>
        <div className="ll:flex ll:flex-wrap ll:gap-1 ll:mb-2">
          {Object.entries(EVENT_TEMPLATES).map(([key, { label }]) => (
            <Button
              key={key}
              onClick={() => loadTemplate(key)}
              className="ll:px-2 ll:text-[10px] ll:h-4"
            >
              Load {label}
            </Button>
          ))}
        </div>
        <textarea
          value={rawJson}
          onChange={(e) => {
            setRawJson(e.target.value);
            setJsonError(null);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="ll:w-full ll:h-32 ll:bg-gray-800 ll:border ll:border-gray-600 ll:rounded ll:p-2 ll:text-xs ll:font-mono ll:text-white ll:resize-y"
          spellCheck={false}
        />
        {jsonError && (
          <p className="ll:text-red-400 ll:text-xs ll:mt-1">{jsonError}</p>
        )}
        <Button onClick={triggerFromJson} className="ll:mt-2 ll:w-full">
          Trigger Custom Event
        </Button>
      </div>

      <div>
        <div className="ll:flex ll:items-center ll:justify-between ll:mb-2">
          <h3 className="ll:text-sm ll:font-semibold">Event Log</h3>
          <Button
            onClick={() => setEventLog([])}
            className="ll:px-2 ll:text-[10px] ll:h-4"
          >
            Clear
          </Button>
        </div>
        <div className="ll:max-h-24 ll:overflow-y-auto ll:bg-gray-800 ll:border ll:border-gray-600 ll:rounded ll:p-2">
          {eventLog.length === 0 ? (
            <p className="ll:text-gray-500 ll:text-xs">No events triggered</p>
          ) : (
            eventLog.map((entry) => (
              <div
                key={entry.id}
                className="ll:text-xs ll:flex ll:gap-2 ll:items-center"
              >
                <span className="ll:text-gray-500">
                  {entry.timestamp.toLocaleTimeString()}
                </span>
                <span
                  className={
                    entry.success ? "ll:text-green-400" : "ll:text-red-400"
                  }
                >
                  {entry.success ? "OK" : "FAIL"}
                </span>
                <span className="ll:text-white">{entry.eventType}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h3 className="ll:text-sm ll:font-semibold ll:mb-2">System Info</h3>
        <p className="ll:text-xs ll:text-gray-400">
          Zoom Factor: {zoomFactor !== null ? zoomFactor : "N/A"}
        </p>
        <p className="ll:text-xs ll:text-gray-400">
          Mode: {import.meta.env.MODE}
        </p>
      </div>
    </div>
  );
};
