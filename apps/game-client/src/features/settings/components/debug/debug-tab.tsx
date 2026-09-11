import { DebugRuntimeState } from "./debug-runtime-state";
import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { SettingsRow } from "@/components/settings/settings-row";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { margonemRuntimeBridge } from "@/lib/margonem-runtime/margonem-runtime-bridge";
import { useGameStore } from "@/store/game.store";
import { createDebugLegendaryLootEvent } from "./debug-legendary-loot-event";
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

const DETECTOR_NPC_PRESETS = {
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
} satisfies Record<string, DetectorNpcConfig>;

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

const EVENT_TEMPLATES = {
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
} satisfies Record<string, { event: GameEvent }>;

const DETECTOR_NPC_ENTRIES = [
  {
    key: "titan",
    preset: DETECTOR_NPC_PRESETS.titan,
    eventLabelKey: "settings.debug.events.detectTitan",
    npcTypeKey: "common:npcTypes.titan",
  },
  {
    key: "hero",
    preset: DETECTOR_NPC_PRESETS.hero,
    eventLabelKey: "settings.debug.events.detectHero",
    npcTypeKey: "common:npcTypes.hero",
  },
  {
    key: "colossus",
    preset: DETECTOR_NPC_PRESETS.colossus,
    eventLabelKey: "settings.debug.events.detectColossus",
    npcTypeKey: "common:npcTypes.colossus",
  },
  {
    key: "elite2",
    preset: DETECTOR_NPC_PRESETS.elite2,
    eventLabelKey: "settings.debug.events.detectElite2",
    npcTypeKey: "common:npcTypes.elite2",
  },
] as const;

// SAFETY: This private literal defines every own enumerable template key; it is never mutated.
const eventTemplateKeys = Object.keys(
  EVENT_TEMPLATES,
) as (keyof typeof EVENT_TEMPLATES)[];

type LogEntry = {
  id: string;
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

  const [rawJson, setRawJson] = useState<string>(() =>
    JSON.stringify(EVENT_TEMPLATES.npcSpawn.event, null, 2),
  );

  const [jsonError, setJsonError] = useState<string | null>(null);

  const [selectedTemplate, setSelectedTemplate] =
    useState<keyof typeof EVENT_TEMPLATES>("npcSpawn");

  const [eventLog, setEventLog] = useState<LogEntry[]>([]);
  const game = useGameStore((s) => s.game);

  const addLogEntry = (eventType: string, success: boolean) => {
    setEventLog((prev) => [
      {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        eventType,
        success,
      },
      ...prev.slice(0, 19),
    ]);
  };

  const triggerEvent = (event: GameEvent, label: string) => {
    const success = margonemRuntimeBridge.triggerManualEvent(event);
    addLogEntry(label, success);
  };

  const triggerFromJson = () => {
    try {
      const event: unknown = JSON.parse(rawJson);
      setJsonError(null);
      const success = margonemRuntimeBridge.triggerManualEvent(event);
      addLogEntry(t("settings.debug.events.customJson"), success);
    } catch (error) {
      setJsonError(
        error instanceof Error
          ? error.message
          : t("settings.debug.invalidJson"),
      );
    }
  };

  const loadTemplate = (templateKey: keyof typeof EVENT_TEMPLATES) => {
    const template = EVENT_TEMPLATES[templateKey];

    if (template) {
      setSelectedTemplate(templateKey);
      setRawJson(JSON.stringify(template.event, null, 2));
      setJsonError(null);
    }
  };

  const runLabel = t("settings.debug.run");

  const renderRunButton = (
    onClick: () => void,
    options: { disabled?: boolean; variant?: "ghost" | "destructive" } = {},
  ) => (
    <Button
      size="sm"
      disabled={options.disabled}
      onClick={onClick}
      type="button"
      variant={options.variant ?? "outline"}
    >
      {runLabel}
    </Button>
  );

  return (
    <SettingsTabLayout>
      <SettingsSection title={t("settings.debug.eventTemplatesTitle")}>
        {eventTemplateKeys.map((key) => (
          <SettingsRow
            description={t(`settings.debug.actions.${key}Description`, {
              defaultValue: "",
            })}
            key={key}
            label={eventLabels[key]}
          >
            {renderRunButton(() =>
              triggerEvent(EVENT_TEMPLATES[key].event, eventLabels[key]),
            )}
          </SettingsRow>
        ))}
        <SettingsRow
          description={t("settings.debug.actions.lootLegendaryDescription")}
          disabled={!game}
          label={t("settings.debug.events.lootLegendary")}
        >
          {renderRunButton(
            () => {
              if (!game) return;
              triggerEvent(
                createDebugLegendaryLootEvent(game),
                t("settings.debug.events.lootLegendary"),
              );
            },
            { disabled: !game },
          )}
        </SettingsRow>
        <SettingsRow
          description={t("settings.debug.actions.killNpcUniqueDescription")}
          label={t("settings.debug.events.killNpcUnique")}
        >
          {renderRunButton(() =>
            triggerEvent(
              createUniqueKillNpcEvent(),
              t("settings.debug.events.killNpcUnique"),
            ),
          )}
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title={t("settings.debug.npcDetectorTitle")}
        description={t("settings.debug.npcDetectorDescription")}
      >
        {DETECTOR_NPC_ENTRIES.map(
          ({ key, preset, eventLabelKey, npcTypeKey }) => (
            <SettingsRow key={key} label={t(npcTypeKey)}>
              {renderRunButton(() =>
                triggerEvent(createDetectorEvent(preset), t(eventLabelKey)),
              )}
            </SettingsRow>
          ),
        )}
      </SettingsSection>

      <SettingsSection
        title={t("settings.debug.partyEventsTitle")}
        description={t("settings.debug.partyEventsDescription")}
      >
        <SettingsRow
          description={t("settings.debug.actions.partyJoinDescription")}
          label={t("settings.debug.events.partyJoin")}
        >
          {renderRunButton(() =>
            triggerEvent(
              createPartyJoinEvent(),
              t("settings.debug.events.partyJoin"),
            ),
          )}
        </SettingsRow>
        <SettingsRow
          description={t("settings.debug.actions.partyLeaveDescription")}
          label={t("settings.debug.events.partyLeave")}
        >
          {renderRunButton(() =>
            triggerEvent(
              createPartyLeaveEvent(),
              t("settings.debug.events.partyLeave"),
            ),
          )}
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title={t("settings.debug.rawJsonTitle")}>
        <SettingsRow
          description={t("settings.debug.templateDescription")}
          label={t("settings.debug.templateLabel")}
        >
          <Select
            onValueChange={(value) =>
              loadTemplate(
                eventTemplateKeys.find((key) => key === value) ?? "npcSpawn",
              )
            }
            value={selectedTemplate}
          >
            <SelectTrigger
              aria-label={t("settings.debug.templateLabel")}
              size="sm"
              className="ll:w-40"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {eventTemplateKeys.map((key) => (
                <SelectItem key={key} value={key}>
                  {eventLabels[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>
        <SettingsRow
          controlClassName="ll:flex-col ll:items-stretch ll:gap-1.5"
          description={
            jsonError ? (
              <span className="ll:text-red-400">{jsonError}</span>
            ) : (
              t("settings.debug.rawJsonDescription")
            )
          }
          htmlFor="debug-raw-json"
          label={t("settings.debug.rawJsonLabel")}
          layout="stacked"
        >
          <textarea
            className="ll:w-full ll:min-h-24 ll:resize-y ll:rounded-sm ll:border ll:border-input ll:bg-black/25 ll:p-2 ll:font-mono ll:text-[11px] ll:text-gray-100 ll:outline-none ll:focus-visible:border-ring"
            id="debug-raw-json"
            onChange={(event) => {
              setRawJson(event.target.value);
              setJsonError(null);
            }}
            onMouseDown={(event) => event.stopPropagation()}
            spellCheck={false}
            value={rawJson}
          />
          <div>
            <Button
              size="sm"
              onClick={triggerFromJson}
              type="button"
              variant="outline"
            >
              {t("settings.debug.triggerCustomEvent")}
            </Button>
          </div>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title={t("settings.debug.eventLogTitle")}
        actions={
          <Button
            size="sm"
            disabled={eventLog.length === 0}
            onClick={() => setEventLog([])}
            type="button"
            variant="destructive"
          >
            {t("common:actions.clear")}
          </Button>
        }
      >
        <SettingsPanel className="ll:max-h-32 ll:overflow-y-auto ll:font-mono ll:text-[11px]">
          {eventLog.length === 0 ? (
            <SettingsEmptyState className="ll:bg-transparent ll:px-0 ll:py-0">
              {t("settings.debug.noEvents")}
            </SettingsEmptyState>
          ) : (
            eventLog.map((entry) => (
              <div key={entry.id} className="ll:flex ll:items-center ll:gap-2">
                <span className="ll:text-muted-foreground">
                  {entry.timestamp.toLocaleTimeString()}
                </span>
                <span
                  className={
                    entry.success ? "ll:text-emerald-200" : "ll:text-red-400"
                  }
                >
                  {entry.success
                    ? t("settings.debug.statusOk")
                    : t("settings.debug.statusFail")}
                </span>
                <span className="ll:text-gray-100">{entry.eventType}</span>
              </div>
            ))
          )}
        </SettingsPanel>
      </SettingsSection>

      <DebugRuntimeState />
    </SettingsTabLayout>
  );
};
