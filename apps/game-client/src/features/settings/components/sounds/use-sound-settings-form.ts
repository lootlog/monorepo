import { NpcType } from "@/api/npcs.api";
import {
  useSoundSettings,
  useUpdateSoundSettings,
} from "@/features/settings/persistence/use-sound-settings";
import { useSoundPlayback } from "@/hooks/use-sound-playback";
import { useGameStore } from "@/store/game.store";
import { useSettingsStore } from "@/store/settings.store";
import type {
  ConfigurableSoundCategory,
  VisibleSoundCategory,
} from "@/features/settings/components/sounds/types";
import { useState } from "react";
import { useTranslation } from "react-i18next";

/** Volume a muted category comes back to when unmuted. */
const UNMUTED_VOLUME = 0.5;

export type SoundField = { label: string; key: string };

export type SoundCategoryDefinition = {
  id: ConfigurableSoundCategory;
  label: string;
  description: string;
  fields: readonly SoundField[];
};

export function useSoundSettingsForm() {
  const gameInterface = useGameStore((state) => state.game?.interface);
  const { data: settings, isLoading } = useSoundSettings();
  const { mutate: updateSettings } = useUpdateSoundSettings();
  const masterVolume = useSettingsStore((state) => state.masterVolume);
  const setMasterVolume = useSettingsStore((state) => state.setMasterVolume);
  const soundsMuted = useSettingsStore((state) => state.soundsMuted);

  const toggleSoundsMuted = useSettingsStore(
    (state) => state.toggleSoundsMuted,
  );

  const { playSoundTest } = useSoundPlayback();
  const { t } = useTranslation();

  const serverVolumes: Record<VisibleSoundCategory, number> = {
    notifications: settings?.notificationsVolume ?? UNMUTED_VOLUME,
    detector: settings?.detectorVolume ?? UNMUTED_VOLUME,
    pings: settings?.pingsVolume ?? 0,
  };

  // Drag previews live locally; a fresh server document resets the preview.
  const [localVolumeState, setLocalVolumeState] = useState({
    source: settings,
    values: serverVolumes,
  });

  const volumes =
    localVolumeState.source === settings
      ? localVolumeState.values
      : serverVolumes;

  const setVolume = (category: VisibleSoundCategory, value: number) => {
    setLocalVolumeState({
      source: settings,
      values: { ...volumes, [category]: value },
    });
  };

  const commitVolume = (category: VisibleSoundCategory, value: number) => {
    setVolume(category, value);
    updateSettings({ [`${category}Volume`]: value });
  };

  // A muted category is persisted as volume 0, so muting needs no extra flag.
  const toggleMuted = (category: VisibleSoundCategory) => {
    commitVolume(category, volumes[category] === 0 ? UNMUTED_VOLUME : 0);
  };

  const [urlErrors, setUrlErrors] = useState<
    Record<string, Record<string, string>>
  >({});

  const notificationFields = [
    { label: t("common:npcTypes.elite2"), key: NpcType.ELITE2 },
    { label: t("common:npcTypes.hero"), key: NpcType.HERO },
    { label: t("common:npcTypes.colossus"), key: NpcType.COLOSSUS },
    { label: t("common:npcTypes.titan"), key: NpcType.TITAN },
    { label: t("common:npcTypes.message"), key: "message" },
  ] as const;

  const detectorFields = notificationFields.filter(
    (field) => field.key !== "message",
  );

  // The "timers" category stays out of the UI while timer sounds are
  // unsupported; its persisted config and volume are preserved untouched.
  const categories: SoundCategoryDefinition[] = [
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
      fields: detectorFields,
    },
  ];

  return {
    isLoading,
    gameInterface,
    updateSettings,
    masterVolume,
    setMasterVolume,
    soundsMuted,
    toggleSoundsMuted,
    playSoundTest,
    t,
    settings,
    volumes,
    setVolume,
    commitVolume,
    toggleMuted,
    urlErrors,
    setUrlErrors,
    categories,
  };
}
