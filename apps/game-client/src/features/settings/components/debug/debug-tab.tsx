import { LOADED_ADDONS } from "@/addons/loader";
import {
  DISABLED_ADDONS_STORAGE_KEY,
  isAddonEnabled,
  useAddonsStore,
} from "@/addons/state";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { gameEventsManager } from "@/lib/game-events-manager";
import {
  dumpOthersDebugState,
  getOthersDebugSnapshot,
  useOthersStore,
} from "@/store/others.store";
import { usePartyStore } from "@/store/party.store";
import type { GameEvent } from "@/types/margonem/game-events/game-event";
import { useMemo, useState, type FC } from "react";

const createBaseEvent = (): Pick<GameEvent, "d" | "e" | "ev"> => ({
  d: ["", "", ""],
  e: "ok",
  ev: Date.now(),
});

const createUniqueKillNpcEvent = (): GameEvent => {
  const uniqueId = Date.now();
  const npcId = -Math.floor(Math.random() * 100000);
  return {
    ...createBaseEvent(),
    f: {
      init: "1",
      endBattle: 1,
      m: [`unique_battle_${uniqueId}`],
      w: {
        [String(npcId)]: {
          id: npcId,
          originalId: Math.abs(npcId),
          name: `Debug Boss #${uniqueId}`,
          lvl: 100,
          prof: "b",
          icon: "e2/worundriel02.gif",
          wt: 85,
          type: 2,
          hpp: 0,
          team: 1,
        },
        "99999": {
          id: 99999,
          originalId: 99999,
          name: "Player",
          lvl: 150,
          prof: "w",
          icon: "/eve/kup23-elf-k.gif",
          wt: 0,
          type: 0,
          hpp: 100,
          team: 0,
        },
      },
    },
  };
};

type DetectorNpcConfig = {
  name: string;
  wt: number;
  icon: string;
  lvl: number;
  prof: string;
};

const DETECTOR_NPC_PRESETS: Record<string, DetectorNpcConfig> = {
  titan: {
    name: "Debug Tytan",
    wt: 102,
    icon: "tyt/maddok-tytan2.gif",
    lvl: 231,
    prof: "h",
  },
  hero: {
    name: "Debug Heros",
    wt: 85,
    icon: "e2/worundriel02.gif",
    lvl: 180,
    prof: "b",
  },
  colossus: {
    name: "Debug Kolos",
    wt: 95,
    icon: "kol/maddok-kolos.gif",
    lvl: 200,
    prof: "m",
  },
  elite2: {
    name: "Debug Elite II",
    wt: 25,
    icon: "e2/demon-e2.gif",
    lvl: 120,
    prof: "w",
  },
};

const createDetectorEvent = (preset: DetectorNpcConfig): GameEvent => {
  const uniqueId = Date.now();
  const npcId = Math.floor(Math.random() * 100000) + 900000;
  const tplId = Math.floor(Math.random() * 10000) + 90000;
  const iconId = Math.floor(Math.random() * 10000) + 90000;

  return {
    ...createBaseEvent(),
    npcs: [
      {
        id: npcId,
        icon: { id: iconId },
        tpl: tplId,
        x: Math.floor(Math.random() * 20) + 5,
        y: Math.floor(Math.random() * 20) + 5,
      },
    ],
    npc_tpls: [
      {
        id: tplId,
        level: preset.lvl,
        nick: `${preset.name} #${uniqueId % 1000}`,
        prof: preset.prof,
        type: 2,
        warrior_type: preset.wt,
        resp_rand: 0,
        elasticLevelFactor: 0,
      },
    ],
    icons: [
      {
        id: iconId,
        icon: preset.icon,
      },
    ],
  };
};

const createPartyJoinEvent = (): GameEvent => ({
  ...createBaseEvent(),
  party: {
    members: {
      "617": {
        id: 617,
        nick: "cashtelan",
        icon: "/kuf/her_xxxiii_nymph_cold_k2.gif",
        commander: 1,
        account: 9822301,
      },
      "12345": {
        id: 12345,
        nick: "Debug Player",
        icon: "/eve/kup23-elf-k.gif",
        account: 1234567,
      },
    },
  },
});

const createPartyLeaveEvent = (): GameEvent => ({
  ...createBaseEvent(),
  party: {
    members: {},
  },
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
  killNpc: {
    label: "Kill NPC",
    event: {
      ...createBaseEvent(),
      f: {
        init: "1",
        endBattle: 1,
        w: {
          "-12341": {
            id: -12341,
            originalId: 12341,
            name: "Debug Bossx",
            lvl: 100,
            prof: "b",
            icon: "e2/worundriel02.gif",
            wt: 85,
            type: 2,
            hpp: 0,
            team: 1,
          },
          "99999": {
            id: 99999,
            originalId: 99999,
            name: "Player",
            lvl: 150,
            prof: "w",
            icon: "/eve/kup23-elf-k.gif",
            wt: 0,
            type: 0,
            hpp: 100,
            team: 0,
          },
        },
      },
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
  const disabledAddonIds = useAddonsStore((s) => s.disabledAddonIds);
  const setAddonEnabled = useAddonsStore((s) => s.setAddonEnabled);
  const resetAddonOverrides = useAddonsStore((s) => s.resetAddonOverrides);
  const partyMembers = usePartyStore((s) => s.members);
  const othersByRuntimeId = useOthersStore((s) => s.playersByRuntimeId);
  const othersDebugLogs = useOthersStore((s) => s.debugLogs);
  const clearOthersDebugLogs = useOthersStore((s) => s.clearDebugLogs);
  const [othersSnapshot, setOthersSnapshot] = useState(() =>
    getOthersDebugSnapshot(),
  );
  const [othersSnapshotUpdatedAt, setOthersSnapshotUpdatedAt] = useState(
    () => new Date(),
  );
  const zoomFactor = window.getZoomFactor ? window.getZoomFactor() : null;
  const liveOthers = useMemo(
    () =>
      Object.values(othersByRuntimeId).sort((a, b) =>
        a.runtimeId.localeCompare(b.runtimeId),
      ),
    [othersByRuntimeId],
  );

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

  const handleAddonToggle = (addonId: string, checked: boolean) => {
    setAddonEnabled(addonId, checked);
  };

  const handleResetAddonOverrides = () => {
    resetAddonOverrides();
  };

  const handleRefreshOthersSnapshot = () => {
    setOthersSnapshot(getOthersDebugSnapshot());
    setOthersSnapshotUpdatedAt(new Date());
  };

  const handleDumpOthersDebugState = () => {
    dumpOthersDebugState();
  };

  const handleClearOthersDebugLogs = () => {
    clearOthersDebugLogs();
  };

  return (
    <div className="ll:flex ll:flex-col ll:gap-4 ll:p-4">
      <div>
        <h3 className="ll:text-sm ll:font-semibold ll:mb-2">Event Templates</h3>
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
          <Button
            onClick={() =>
              triggerEvent(createUniqueKillNpcEvent(), "Kill NPC (unique)")
            }
            className="ll:px-2 ll:bg-green-700 hover:ll:bg-green-600"
          >
            Kill NPC (unique)
          </Button>
        </div>
      </div>

      <div>
        <h3 className="ll:text-sm ll:font-semibold ll:mb-2">
          NPC Detector Events
        </h3>
        <p className="ll:text-[10px] ll:text-gray-400 ll:mb-2">
          Triggers NPC detection (requires detector settings enabled)
        </p>
        <div className="ll:flex ll:flex-wrap ll:gap-1">
          <Button
            onClick={() =>
              triggerEvent(
                createDetectorEvent(DETECTOR_NPC_PRESETS.titan),
                "Detect Titan",
              )
            }
            className="ll:px-2 ll:bg-purple-700 hover:ll:bg-purple-600"
          >
            Titan
          </Button>
          <Button
            onClick={() =>
              triggerEvent(
                createDetectorEvent(DETECTOR_NPC_PRESETS.hero),
                "Detect Hero",
              )
            }
            className="ll:px-2 ll:bg-orange-700 hover:ll:bg-orange-600"
          >
            Hero
          </Button>
          <Button
            onClick={() =>
              triggerEvent(
                createDetectorEvent(DETECTOR_NPC_PRESETS.colossus),
                "Detect Colossus",
              )
            }
            className="ll:px-2 ll:bg-blue-700 hover:ll:bg-blue-600"
          >
            Colossus
          </Button>
          <Button
            onClick={() =>
              triggerEvent(
                createDetectorEvent(DETECTOR_NPC_PRESETS.elite2),
                "Detect Elite II",
              )
            }
            className="ll:px-2 ll:bg-yellow-700 hover:ll:bg-yellow-600"
          >
            Elite II
          </Button>
        </div>
      </div>

      <div>
        <h3 className="ll:text-sm ll:font-semibold ll:mb-2">
          Party Events
        </h3>
        <p className="ll:text-[10px] ll:text-gray-400 ll:mb-2">
          Triggers party member changes
        </p>
        <div className="ll:flex ll:flex-wrap ll:gap-1">
          <Button
            onClick={() =>
              triggerEvent(createPartyJoinEvent(), "Party Join")
            }
            className="ll:px-2 ll:bg-teal-700 hover:ll:bg-teal-600"
          >
            Party Join
          </Button>
          <Button
            onClick={() =>
              triggerEvent(createPartyLeaveEvent(), "Party Leave")
            }
            className="ll:px-2 ll:bg-red-700 hover:ll:bg-red-600"
          >
            Party Leave
          </Button>
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
        <h3 className="ll:text-sm ll:font-semibold ll:mb-2">Party State</h3>
        <div className="ll:bg-gray-800 ll:border ll:border-gray-600 ll:rounded ll:p-2">
          {partyMembers.length === 0 ? (
            <p className="ll:text-gray-500 ll:text-xs">No party members</p>
          ) : (
            partyMembers.map((member) => (
              <div
                key={member.id}
                className="ll:text-xs ll:flex ll:gap-2 ll:items-center"
              >
                <span className="ll:text-white">
                  {member.nick}
                </span>
                <span className="ll:text-gray-400">
                  (ID: {member.id})
                </span>
                {member.leader && (
                  <span className="ll:text-yellow-400">Leader</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <div className="ll:flex ll:items-center ll:justify-between ll:mb-2">
          <h3 className="ll:text-sm ll:font-semibold">Others Store Debug</h3>
          <div className="ll:flex ll:gap-1">
            <Button
              onClick={handleRefreshOthersSnapshot}
              className="ll:px-2 ll:text-[10px] ll:h-4"
            >
              Refresh Snapshot
            </Button>
            <Button
              onClick={handleDumpOthersDebugState}
              className="ll:px-2 ll:text-[10px] ll:h-4 ll:bg-indigo-700 hover:ll:bg-indigo-600"
            >
              Dump to Console
            </Button>
            <Button
              onClick={handleClearOthersDebugLogs}
              disabled={othersDebugLogs.length === 0}
              className="ll:px-2 ll:text-[10px] ll:h-4 ll:bg-red-700 hover:ll:bg-red-600"
            >
              Clear Logs
            </Button>
          </div>
        </div>

        <p className="ll:text-[10px] ll:text-gray-400 ll:mb-2">
          Live players: {liveOthers.length} | Snapshot players:{" "}
          {othersSnapshot.count} | Snapshot updated:{" "}
          {othersSnapshotUpdatedAt.toLocaleTimeString()}
        </p>

        <div className="ll:bg-gray-800 ll:border ll:border-gray-600 ll:rounded ll:p-2 ll:space-y-2">
          <div>
            <p className="ll:text-xs ll:text-white ll:font-semibold ll:mb-1">
              Players by Runtime ID
            </p>
            <div className="ll:max-h-24 ll:overflow-y-auto">
              {liveOthers.length === 0 ? (
                <p className="ll:text-gray-500 ll:text-xs">No tracked players</p>
              ) : (
                liveOthers.map((player) => (
                  <div
                    key={player.runtimeId}
                    className="ll:text-xs ll:flex ll:gap-2 ll:items-center ll:font-mono"
                  >
                    <span className="ll:text-cyan-300">{player.runtimeId}</span>
                    <span className="ll:text-gray-300">
                      char: {player.characterId}
                    </span>
                    <span className="ll:text-gray-300">
                      acc: {player.accountId}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <p className="ll:text-xs ll:text-white ll:font-semibold ll:mb-1">
              Recent Debug Logs
            </p>
            <div className="ll:max-h-32 ll:overflow-y-auto ll:space-y-1">
              {othersDebugLogs.length === 0 ? (
                <p className="ll:text-gray-500 ll:text-xs">No debug logs</p>
              ) : (
                othersDebugLogs.slice(0, 30).map((entry) => (
                  <div
                    key={entry.id}
                    className="ll:text-[10px] ll:border ll:border-gray-700 ll:rounded ll:p-1"
                  >
                    <div className="ll:flex ll:items-center ll:gap-2 ll:flex-wrap">
                      <span className="ll:text-gray-500">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="ll:text-emerald-300">{entry.source}</span>
                      <span className="ll:text-white">{entry.type}</span>
                      <span className="ll:text-gray-400">
                        {entry.beforeCount} → {entry.afterCount}
                      </span>
                    </div>
                    {entry.details && (
                      <pre className="ll:mt-1 ll:text-[10px] ll:text-gray-300 ll:whitespace-pre-wrap ll:break-all">
                        {JSON.stringify(entry.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="ll:flex ll:items-center ll:justify-between ll:mb-2">
          <h3 className="ll:text-sm ll:font-semibold">Addon Runtime</h3>
          <Button
            onClick={handleResetAddonOverrides}
            disabled={disabledAddonIds.length === 0}
            className="ll:px-2 ll:text-[10px] ll:h-4"
          >
            Reset Overrides
          </Button>
        </div>
        <div className="ll:bg-gray-800 ll:border ll:border-gray-600 ll:rounded ll:p-2 ll:space-y-2">
          {LOADED_ADDONS.length === 0 ? (
            <p className="ll:text-gray-500 ll:text-xs">
              No addons discovered in <code>src/addons/extensions</code>
            </p>
          ) : (
            LOADED_ADDONS.map((addon) => {
              const enabled = isAddonEnabled(addon, disabledAddonIds);
              const isAlwaysEnabled = addon.alwaysEnabled === true;

              return (
                <div
                  key={addon.id}
                  className="ll:flex ll:items-center ll:justify-between ll:gap-2 ll:border ll:border-gray-700 ll:rounded ll:p-2"
                >
                  <div className="ll:min-w-0">
                    <p className="ll:text-xs ll:text-white ll:font-semibold">
                      {addon.name}
                    </p>
                    <p className="ll:text-[10px] ll:text-gray-400 ll:truncate">
                      {addon.id}
                    </p>
                    {addon.description && (
                      <p className="ll:text-[10px] ll:text-gray-300">
                        {addon.description}
                      </p>
                    )}
                    {isAlwaysEnabled && (
                      <p className="ll:text-[10px] ll:text-emerald-300">
                        Always enabled
                      </p>
                    )}
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) =>
                      handleAddonToggle(addon.id, checked)
                    }
                    disabled={isAlwaysEnabled}
                    aria-label={`Toggle addon ${addon.name}`}
                  />
                </div>
              );
            })
          )}
        </div>
        <p className="ll:text-[10px] ll:text-gray-400 ll:mt-1">
          Storage key: <code>{DISABLED_ADDONS_STORAGE_KEY}</code>
        </p>
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
