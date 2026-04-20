import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Button } from "@/components/ui/button";
import { gameEventsManager } from "@/lib/game-events-manager";
import { usePartyStore } from "@/store/party.store";
import type { GameEvent } from "@lootlog/margonem/game-events";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";

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
  npcId: number;
  name: string;
  wt: number;
  icon: string;
  lvl: number;
  prof: string;
};

const DETECTOR_NPC_PRESETS: Record<string, DetectorNpcConfig> = {
  titan: {
    npcId: 123,
    name: "Debug Tytan",
    wt: 102,
    icon: "tyt/maddok-tytan2.gif",
    lvl: 231,
    prof: "h",
  },
  hero: {
    npcId: 124,
    name: "Debug Heros",
    wt: 85,
    icon: "e2/worundriel02.gif",
    lvl: 180,
    prof: "b",
  },
  colossus: {
    npcId: 125,
    name: "Debug Kolos",
    wt: 95,
    icon: "her/viv_nandin_i3bd1.gif",
    lvl: 200,
    prof: "m",
  },
  elite2: {
    npcId: 126,
    name: "Debug Elite II",
    wt: 25,
    icon: "her/viv_nandin_i3bd1.gif",
    lvl: 120,
    prof: "w",
  },
};

const createDetectorEvent = (preset: DetectorNpcConfig): GameEvent => {
  const uniqueId = Date.now();
  const npcId = preset.npcId;
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

const EVENT_TEMPLATES: Record<string, { event: GameEvent }> = {
  npcSpawn: {
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
    event: {
      ...createBaseEvent(),
      npcs_del: [{ id: 999999 }],
    },
  },
  killNpc: {
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
    event: {
      ...createBaseEvent(),
      h: { stasis: 1 },
    },
  },
  afkOff: {
    event: {
      ...createBaseEvent(),
      h: { stasis: 0 },
    },
  },
  lootFight: {
    event: {
      ...createBaseEvent(),
      loot: {
        source: "fight",
        states: { "123456": 1 },
      },
    },
  },
  lootDialog: {
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
  const { t } = useTranslation();
  const eventLabels = {
    npcSpawn: t("settings.debug.events.npcSpawn"),
    npcDelete: t("settings.debug.events.npcDelete"),
    killNpc: t("settings.debug.events.killNpc"),
    townChange: t("settings.debug.events.townChange"),
    afkOn: t("settings.debug.events.afkOn"),
    afkOff: t("settings.debug.events.afkOff"),
    lootFight: t("settings.debug.events.lootFight"),
    lootDialog: t("settings.debug.events.lootDialog"),
  } as const;
  const [rawJson, setRawJson] = useState<string>(
    JSON.stringify(EVENT_TEMPLATES.npcSpawn.event, null, 2),
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [eventLog, setEventLog] = useState<LogEntry[]>([]);
  const partyMembers = usePartyStore((s) => s.members);
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
      addLogEntry(t("settings.debug.events.customJson"), success);
    } catch (error) {
      setJsonError(
        error instanceof Error
          ? error.message
          : t("settings.debug.invalidJson"),
      );
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
    <SettingsTabLayout
      title={t("settings.debug.title")}
      description={t("settings.debug.description")}
      className="ll:px-2 ll:pb-2"
    >
      <SettingsSection title={t("settings.debug.eventTemplatesTitle")}>
        <div className="ll:flex ll:flex-wrap ll:gap-1">
          {Object.entries(EVENT_TEMPLATES).map(([key, { event }]) => (
            <Button
              key={key}
              onClick={() =>
                triggerEvent(
                  event,
                  eventLabels[key as keyof typeof eventLabels],
                )
              }
              className="ll:px-2"
            >
              {eventLabels[key as keyof typeof eventLabels]}
            </Button>
          ))}
          <Button
            onClick={() =>
              triggerEvent(
                createUniqueKillNpcEvent(),
                t("settings.debug.events.killNpcUnique"),
              )
            }
            className="ll:px-2 ll:bg-green-700 hover:ll:bg-green-600"
          >
            {t("settings.debug.events.killNpcUnique")}
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection
        title={t("settings.debug.npcDetectorTitle")}
        description={t("settings.debug.npcDetectorDescription")}
      >
        <div className="ll:flex ll:flex-wrap ll:gap-1">
          <Button
            onClick={() =>
              triggerEvent(
                createDetectorEvent(DETECTOR_NPC_PRESETS.titan),
                t("settings.debug.events.detectTitan"),
              )
            }
            className="ll:px-2 ll:bg-purple-700 hover:ll:bg-purple-600"
          >
            {t("common:npcTypes.titan")}
          </Button>
          <Button
            onClick={() =>
              triggerEvent(
                createDetectorEvent(DETECTOR_NPC_PRESETS.hero),
                t("settings.debug.events.detectHero"),
              )
            }
            className="ll:px-2 ll:bg-orange-700 hover:ll:bg-orange-600"
          >
            {t("common:npcTypes.hero")}
          </Button>
          <Button
            onClick={() =>
              triggerEvent(
                createDetectorEvent(DETECTOR_NPC_PRESETS.colossus),
                t("settings.debug.events.detectColossus"),
              )
            }
            className="ll:px-2 ll:bg-blue-700 hover:ll:bg-blue-600"
          >
            {t("common:npcTypes.colossus")}
          </Button>
          <Button
            onClick={() =>
              triggerEvent(
                createDetectorEvent(DETECTOR_NPC_PRESETS.elite2),
                t("settings.debug.events.detectElite2"),
              )
            }
            className="ll:px-2 ll:bg-yellow-700 hover:ll:bg-yellow-600"
          >
            {t("common:npcTypes.elite2")}
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection
        title={t("settings.debug.partyEventsTitle")}
        description={t("settings.debug.partyEventsDescription")}
      >
        <div className="ll:flex ll:flex-wrap ll:gap-1">
          <Button
            onClick={() =>
              triggerEvent(
                createPartyJoinEvent(),
                t("settings.debug.events.partyJoin"),
              )
            }
            className="ll:px-2 ll:bg-teal-700 hover:ll:bg-teal-600"
          >
            {t("settings.debug.events.partyJoin")}
          </Button>
          <Button
            onClick={() =>
              triggerEvent(
                createPartyLeaveEvent(),
                t("settings.debug.events.partyLeave"),
              )
            }
            className="ll:px-2 ll:bg-red-700 hover:ll:bg-red-600"
          >
            {t("settings.debug.events.partyLeave")}
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection title={t("settings.debug.rawJsonTitle")}>
        <div className="ll:flex ll:flex-wrap ll:gap-1 ll:mb-2">
          {Object.keys(EVENT_TEMPLATES).map((key) => (
            <Button
              key={key}
              onClick={() => loadTemplate(key)}
              className="ll:px-2 ll:text-[10px] ll:h-4"
            >
              {t("settings.debug.loadTemplate", {
                label: eventLabels[key as keyof typeof eventLabels],
              })}
            </Button>
          ))}
        </div>
        <SettingsPanel className="ll:p-2">
          <textarea
            value={rawJson}
            onChange={(e) => {
              setRawJson(e.target.value);
              setJsonError(null);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="ll:h-32 ll:w-full ll:resize-y ll:border-none ll:bg-transparent ll:p-0 ll:text-xs ll:font-mono ll:text-white ll:outline-none"
            spellCheck={false}
          />
        </SettingsPanel>
        {jsonError && (
          <p className="ll:text-red-400 ll:text-xs ll:mt-1">{jsonError}</p>
        )}
        <Button onClick={triggerFromJson} className="ll:mt-2 ll:w-full">
          {t("settings.debug.triggerCustomEvent")}
        </Button>
      </SettingsSection>

      <SettingsSection
        title={t("settings.debug.eventLogTitle")}
        actions={
          <Button
            onClick={() => setEventLog([])}
            className="ll:px-2 ll:text-[10px] ll:h-4"
          >
            {t("common:actions.clear")}
          </Button>
        }
      >
        <SettingsPanel className="ll:max-h-24 ll:overflow-y-auto ll:p-2">
          {eventLog.length === 0 ? (
            <SettingsEmptyState className="ll:border-none ll:bg-transparent ll:px-0 ll:py-0">
              {t("settings.debug.noEvents")}
            </SettingsEmptyState>
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
                  {entry.success
                    ? t("settings.debug.statusOk")
                    : t("settings.debug.statusFail")}
                </span>
                <span className="ll:text-white">{entry.eventType}</span>
              </div>
            ))
          )}
        </SettingsPanel>
      </SettingsSection>

      <SettingsSection title={t("settings.debug.partyStateTitle")}>
        <SettingsPanel className="ll:p-2">
          {partyMembers.length === 0 ? (
            <SettingsEmptyState className="ll:border-none ll:bg-transparent ll:px-0 ll:py-0">
              {t("settings.debug.noPartyMembers")}
            </SettingsEmptyState>
          ) : (
            partyMembers.map((member) => (
              <div
                key={member.id}
                className="ll:text-xs ll:flex ll:gap-2 ll:items-center"
              >
                <span className="ll:text-white">{member.nick}</span>
                <span className="ll:text-gray-400">(ID: {member.id})</span>
                {member.leader && (
                  <span className="ll:text-yellow-400">
                    {t("settings.debug.leader")}
                  </span>
                )}
              </div>
            ))
          )}
        </SettingsPanel>
      </SettingsSection>

      <SettingsSection title={t("settings.debug.systemInfoTitle")}>
        <SettingsPanel className="ll:space-y-1">
          <p className="ll:text-xs ll:text-gray-400">
            {t("settings.debug.zoomFactor", {
              value:
                zoomFactor !== null
                  ? zoomFactor
                  : t("settings.debug.notAvailable"),
            })}
          </p>
          <p className="ll:text-xs ll:text-gray-400">
            {t("settings.debug.mode", { mode: import.meta.env.MODE })}
          </p>
        </SettingsPanel>
      </SettingsSection>
    </SettingsTabLayout>
  );
};
