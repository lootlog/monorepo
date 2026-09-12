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
import {
  createDetectorEvent,
  createPartyJoinEvent,
  createPartyLeaveEvent,
  createUniqueKillNpcEvent,
  DEBUG_EVENT_TEMPLATES,
  DETECTOR_NPC_PRESETS,
} from "./debug-game-events";
import type { GameEvent } from "@lootlog/margonem/game-events";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";

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

// SAFETY: This exported literal defines every own enumerable template key; it is never mutated.
const eventTemplateKeys = Object.keys(
  DEBUG_EVENT_TEMPLATES,
) as (keyof typeof DEBUG_EVENT_TEMPLATES)[];

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
    JSON.stringify(DEBUG_EVENT_TEMPLATES.npcSpawn.event, null, 2),
  );

  const [jsonError, setJsonError] = useState<string | null>(null);

  const [selectedTemplate, setSelectedTemplate] =
    useState<keyof typeof DEBUG_EVENT_TEMPLATES>("npcSpawn");

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

  const loadTemplate = (templateKey: keyof typeof DEBUG_EVENT_TEMPLATES) => {
    const template = DEBUG_EVENT_TEMPLATES[templateKey];

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
              triggerEvent(DEBUG_EVENT_TEMPLATES[key].event, eventLabels[key]),
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

      <SettingsSection title={t("settings.debug.npcDetectorTitle")}>
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

      <SettingsSection title={t("settings.debug.partyEventsTitle")}>
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
            className="ll:w-full ll:min-h-24 ll:resize-y ll:rounded-sm ll:border ll:border-input ll:bg-black/25 ll:p-2 ll:font-mono ll:text-xs ll:text-gray-100 ll:outline-none ll:focus-visible:border-ring"
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
        <SettingsPanel className="ll:max-h-32 ll:overflow-y-auto ll:font-mono ll:text-xs">
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
