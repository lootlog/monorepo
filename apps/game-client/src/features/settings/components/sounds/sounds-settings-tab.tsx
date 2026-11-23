import { EmptyState } from "@/components/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { SettingsRow } from "@/features/settings/components/shared/settings-row";
import { SettingsSection } from "@/features/settings/components/shared/settings-section";
import { SettingsTabLayout } from "@/features/settings/components/shared/settings-tab-layout";
import { SettingsVolumeControl } from "@/features/settings/components/shared/settings-volume-row";
import {
  getCategoryFallbackSoundUrl,
  type ConfigurableSoundCategory,
  type SoundCategory,
} from "@/lib/default-sounds";
import { omit } from "es-toolkit";
import { Play } from "lucide-react";
import { SoundCategorySection } from "./sound-category-section";
import { SoundFieldInput } from "./sound-field-input";
import { TimerSoundTriggers } from "./timer-sound-triggers";
import { TIMER_NPC_TYPES } from "@/features/timers/constants/timer-npc-types";
import { NpcType } from "@/api/npcs.api";
import {
  useSoundSettings,
  useTimerSoundSettings,
  useUpdateSoundSettings,
} from "@/lib/settings-persistence/use-sound-settings";
import { useSoundPlayback } from "@/hooks/use-sound-playback";
import { useGameStore } from "@/store/game.store";
import { useSettingsStore } from "@/store/settings.store";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

const DEFAULT_NPC_CONFIG = { volume: 0.5, soundUrl: "" };

const UNMUTED_VOLUME = 0.5;

const isValidUrl = (url: string): boolean => {
  if (url.trim() === "") return true;

  try {
    new URL(url);

    return true;
  } catch {
    return false;
  }
};

export function SoundsSettingsTab() {
  const gameInterface = useGameStore((state) => state.game?.interface);
  const { data: settings, isLoading } = useSoundSettings();
  const { mutate: updateSettings } = useUpdateSoundSettings();
  const timerSoundSettings = useTimerSoundSettings();
  const masterVolume = useSettingsStore((state) => state.masterVolume);
  const setMasterVolume = useSettingsStore((state) => state.setMasterVolume);
  const soundsMuted = useSettingsStore((state) => state.soundsMuted);

  const toggleSoundsMuted = useSettingsStore(
    (state) => state.toggleSoundsMuted,
  );

  const { playSoundTest } = useSoundPlayback();
  const { t } = useTranslation();

  const [urlErrors, setUrlErrors] = useState<
    Record<string, Record<string, string>>
  >({});

  const volumes: Record<SoundCategory, number> = {
    notifications: settings?.notificationsVolume ?? UNMUTED_VOLUME,
    detector: settings?.detectorVolume ?? UNMUTED_VOLUME,
    timers: settings?.timersVolume ?? UNMUTED_VOLUME,
    pings: settings?.pingsVolume ?? 0,
  };

  const commitVolume = (category: SoundCategory, value: number) =>
    updateSettings({ [`${category}Volume`]: value });

  const toggleMuted = (category: SoundCategory) =>
    commitVolume(category, volumes[category] === 0 ? UNMUTED_VOLUME : 0);

  const notificationFields = [
    { label: t("npcType:ELITE2"), key: NpcType.ELITE2 },
    { label: t("npcType:HERO"), key: NpcType.HERO },
    { label: t("npcType:EVENT_HERO"), key: NpcType.EVENT_HERO },
    { label: t("npcType:COLOSSUS"), key: NpcType.COLOSSUS },
    { label: t("npcType:TITAN"), key: NpcType.TITAN },
    { label: t("npcType:HERO_TRACKER"), key: NpcType.HERO_TRACKER },
    { label: t("common:npcTypes.message"), key: "message" },
  ];

  const categories: {
    id: ConfigurableSoundCategory;
    label: string;
    description: string;
    fields: readonly { label: string; key: string }[];
    canDisableFields?: boolean;
    triggers?: ReactNode;
  }[] = [
    {
      id: "notifications",
      label: t("settings.sounds.categories.notifications.label"),
      description: t("settings.sounds.categories.notifications.description"),
      fields: notificationFields,
    },
    {
      id: "detector",
      label: t("settings.sounds.categories.detector.label"),
      description: t("settings.sounds.categories.detector.description"),
      fields: notificationFields.filter((field) => field.key !== "message"),
    },
    {
      id: "timers",
      label: t("settings.sounds.categories.timers.label"),
      description: t("settings.sounds.categories.timers.description"),
      fields: TIMER_NPC_TYPES.map((npcType) => ({
        label: t(`npcType:${npcType}`),
        key: npcType,
      })),
      canDisableFields: true,
      triggers: <TimerSoundTriggers settings={timerSoundSettings} />,
    },
  ];

  if (isLoading) {
    return (
      <SettingsTabLayout>
        <EmptyState description={t("settings.sounds.loading")} />
      </SettingsTabLayout>
    );
  }

  const muteLabel = t("common:actions.mute");
  const unmuteLabel = t("common:actions.unmute");

  return (
    <SettingsTabLayout>
      <SettingsSection
        controlId="sound-master-volume"
        title={t("settings.sounds.masterTitle")}
        description={t("settings.sounds.masterDescription")}
      >
        <SettingsRow label={t("settings.sounds.masterVolume")} control="wide">
          <SettingsVolumeControl
            label={t("settings.sounds.masterVolume")}
            muteLabel={muteLabel}
            unmuteLabel={unmuteLabel}
            volume={masterVolume}
            muted={soundsMuted}
            onVolumeChange={setMasterVolume}
            onVolumeCommit={setMasterVolume}
            onMuteToggle={() => toggleSoundsMuted()}
          />
        </SettingsRow>
      </SettingsSection>

      {categories.map((category) => {
        const configKey = `${category.id}Config` as const;
        const categoryConfig = settings?.[configKey] ?? {};
        const categoryErrors = urlErrors[category.id] ?? {};

        const setSoundUrl = (key: string, soundUrl: string) => {
          if (!isValidUrl(soundUrl)) {
            setUrlErrors((previous) => ({
              ...previous,
              [category.id]: {
                ...previous[category.id],
                [key]: t("settings.sounds.invalidUrl"),
              },
            }));

            return;
          }

          setUrlErrors((previous) => {
            const errors = previous[category.id];

            if (!errors || !(key in errors)) return previous;

            const remaining = omit(errors, [key]);
            const others = omit(previous, [category.id]);

            return Object.keys(remaining).length > 0
              ? { ...others, [category.id]: remaining }
              : others;
          });

          const currentConfig = categoryConfig[key] ?? DEFAULT_NPC_CONFIG;

          updateSettings({
            [configKey]: { [key]: { ...currentConfig, soundUrl } },
          });
        };

        return (
          <SoundCategorySection
            key={category.id}
            controlId={`sound-${category.id}`}
            title={category.label}
            description={category.description}
            volume={volumes[category.id]}
            onVolumeCommit={(value) => commitVolume(category.id, value)}
            onMuteToggle={() => toggleMuted(category.id)}
          >
            {category.triggers}
            {category.fields.map((field) => {
              const fieldConfig = categoryConfig[field.key];
              const soundUrl = fieldConfig?.soundUrl ?? "";

              return (
                <SoundFieldInput
                  key={field.key}
                  category={category.id}
                  fieldKey={field.key}
                  label={field.label}
                  soundUrl={soundUrl}
                  placeholder={getCategoryFallbackSoundUrl(
                    category.id,
                    categoryConfig,
                    field.key,
                  )}
                  error={categoryErrors[field.key]}
                  onSoundUrlChange={(value) => setSoundUrl(field.key, value)}
                  onPlaySound={() =>
                    playSoundTest(category.id, field.key, soundUrl)
                  }
                  enabled={
                    category.canDisableFields
                      ? {
                          checked: fieldConfig?.enabled ?? false,
                          label: t("settings.sounds.fieldEnabledLabel", {
                            field: field.label,
                          }),
                          onCheckedChange: (checked) =>
                            updateSettings({
                              [configKey]: {
                                [field.key]: { enabled: checked },
                              },
                            }),
                        }
                      : undefined
                  }
                />
              );
            })}
          </SoundCategorySection>
        );
      })}

      {gameInterface === "ni" ? (
        <SoundCategorySection
          controlId="sound-pings"
          title={t("settings.sounds.categories.pings.label")}
          description={t("settings.sounds.categories.pings.description")}
          volume={volumes.pings}
          onVolumeCommit={(value) => commitVolume("pings", value)}
          onMuteToggle={() => toggleMuted("pings")}
          actions={
            <IconButton
              label={t("common:actions.playSound")}
              onClick={() => playSoundTest("pings", "mapPing")}
            >
              <Play aria-hidden />
            </IconButton>
          }
        />
      ) : null}
    </SettingsTabLayout>
  );
}
