import { NpcType } from "@/api/npcs.api";
import {
  useSoundSettings,
  useUpdateSoundSettings,
} from "@/features/settings/persistence/use-sound-settings";
import { useSoundPlayback } from "@/hooks/use-sound-playback";
import { useGameStore } from "@/store/game.store";
import { useSettingsStore } from "@/store/settings.store";
import type { SoundCategory } from "@/features/settings/components/sounds/types";
import { Bell, Clock, Crosshair, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function useSoundSettingsForm() {
  const gameInterface = useGameStore((state) => state.game?.interface);
  const { data: soundSettings, isLoading } = useSoundSettings();
  const { mutate: updateSettings, isPending } = useUpdateSoundSettings();
  const masterVolume = useSettingsStore((state) => state.masterVolume);
  const setMasterVolume = useSettingsStore((state) => state.setMasterVolume);
  const soundsMuted = useSettingsStore((state) => state.soundsMuted);

  const toggleSoundsMuted = useSettingsStore(
    (state) => state.toggleSoundsMuted,
  );

  const { playSoundTest } = useSoundPlayback();
  const { t } = useTranslation(["settings", "common"]);

  const settings = soundSettings;

  const [mutedCategories, setMutedCategories] = useState<
    Record<SoundCategory, boolean>
  >({
    notifications: false,
    detector: false,
    timers: false,
    pings: false,
  });

  const serverVolumes = {
    notifications: soundSettings?.notificationsVolume ?? 0.5,
    detector: soundSettings?.detectorVolume ?? 0.5,
    timers: soundSettings?.timersVolume ?? 0.5,
    pings: soundSettings?.pingsVolume ?? 0,
  };

  const [localVolumeState, setLocalVolumeState] = useState({
    source: soundSettings,
    values: serverVolumes,
  });

  const localVolumes =
    localVolumeState.source === soundSettings
      ? localVolumeState.values
      : serverVolumes;

  const setLocalVolumes = (
    update: (currentVolumes: typeof localVolumes) => typeof localVolumes,
  ) => {
    setLocalVolumeState((currentState) => {
      const currentVolumes =
        currentState.source === soundSettings
          ? currentState.values
          : serverVolumes;

      return {
        source: soundSettings,
        values: update(currentVolumes),
      };
    });
  };

  const [urlErrors, setUrlErrors] = useState<
    Record<string, Record<string, string>>
  >({});

  const notificationNpcTypes = [
    { label: t("common:npcTypes.message"), key: "message" },
    { label: t("common:npcTypes.elite2"), key: NpcType.ELITE2 },
    { label: t("common:npcTypes.hero"), key: NpcType.HERO },
    { label: t("common:npcTypes.colossus"), key: NpcType.COLOSSUS },
    { label: t("common:npcTypes.titan"), key: NpcType.TITAN },
  ] as const;

  const detectorTimerNpcTypes = notificationNpcTypes.filter(
    (field) => field.key !== "message",
  );

  const categories: {
    id: Exclude<SoundCategory, "pings">;
    label: string;
    icon: LucideIcon;
    fields: typeof notificationNpcTypes | typeof detectorTimerNpcTypes;
    description: string;
  }[] = [
    {
      id: "notifications",
      label: t("sounds.categories.notifications.label"),
      icon: Bell,
      fields: notificationNpcTypes,
      description: t("sounds.categories.notifications.description"),
    },
    {
      id: "detector",
      label: t("sounds.categories.detector.label"),
      icon: Crosshair,
      fields: detectorTimerNpcTypes,
      description: t("sounds.categories.detector.description"),
    },
    {
      id: "timers",
      label: t("sounds.categories.timers.label"),
      icon: Clock,
      fields: detectorTimerNpcTypes,
      description: t("sounds.categories.timers.description"),
    },
  ];

  // The shared settings patch queue already debounces and merges nested
  // sound configuration patches.
  const queueSoundConfigPatch = updateSettings;

  return {
    isLoading,
    gameInterface,
    updateSettings,
    isPending,
    masterVolume,
    setMasterVolume,
    soundsMuted,
    toggleSoundsMuted,
    playSoundTest,
    t,
    settings,
    mutedCategories,
    setMutedCategories,
    localVolumes,
    setLocalVolumes,
    urlErrors,
    setUrlErrors,
    categories,
    queueSoundConfigPatch,
  };
}
