import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Accordion } from "@/components/ui/accordion";
import { NpcType } from "@/api/npcs.api";
import {
  useSoundSettings,
  useUpdateSoundSettings,
} from "@/hooks/api/use-sound-settings";
import { useSoundPlayback } from "@/hooks/use-sound-playback";
import { normalizeSoundSettings } from "@/lib/api/generated-helpers";
import { useGameStore } from "@/store/game.store";
import { useSettingsStore } from "@/store/settings.store";
import type { SoundCategory } from "@/features/settings/components/sounds/types";
import { Bell, Clock, Crosshair, Loader2, MapPin, Play } from "lucide-react";
import { useState, type FC, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CategoryAccordionItem } from "./category-accordion-item";
import { MasterVolumeControl } from "./master-volume-control";
import { CategoryVolumeControl } from "./category-volume-control";
import { Button } from "@/components/ui/button";
import { useSoundSettingsPatchQueue } from "./use-sound-settings-patch-queue";

const DEFAULT_NPC_CONFIG = { volume: 0.5, soundUrl: "" };

const isValidUrl = (url: string): boolean => {
  if (!url || url.trim() === "") {
    return true;
  }

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const SoundsSettingsTab: FC = () => {
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
  const settings = soundSettings
    ? normalizeSoundSettings(soundSettings)
    : undefined;
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
    icon: ReactNode;
    fields: typeof notificationNpcTypes | typeof detectorTimerNpcTypes;
    description: string;
  }[] = [
    {
      id: "notifications",
      label: t("sounds.categories.notifications.label"),
      icon: <Bell className="ll:size-4" />,
      fields: notificationNpcTypes,
      description: t("sounds.categories.notifications.description"),
    },
    {
      id: "detector",
      label: t("sounds.categories.detector.label"),
      icon: <Crosshair className="ll:size-4" />,
      fields: detectorTimerNpcTypes,
      description: t("sounds.categories.detector.description"),
    },
    {
      id: "timers",
      label: t("sounds.categories.timers.label"),
      icon: <Clock className="ll:size-4" />,
      fields: detectorTimerNpcTypes,
      description: t("sounds.categories.timers.description"),
    },
  ];
  const queueSoundConfigPatch = useSoundSettingsPatchQueue(updateSettings);

  if (isLoading) {
    return (
      <SettingsTabLayout title={t("sounds.title")}>
        <p className="ll:text-[12px] ll:text-gray-400">{t("sounds.loading")}</p>
      </SettingsTabLayout>
    );
  }

  return (
    <SettingsTabLayout
      title={t("sounds.title")}
      description={t("sounds.description")}
      className="ll:relative"
    >
      {isPending ? (
        <div className="ll:absolute ll:top-2 ll:right-2">
          <Loader2 className="ll:size-4 ll:animate-spin ll:text-primary" />
        </div>
      ) : null}
      <div className="ll:flex ll:flex-col ll:gap-4 ll:pb-6 ll:pr-1">
        <MasterVolumeControl
          isMuted={soundsMuted}
          volume={masterVolume}
          onVolumeChange={(value) => {
            setMasterVolume(value[0]);
          }}
          onVolumeCommit={(value) => {
            setMasterVolume(value[0]);
          }}
          onMuteToggle={() => {
            toggleSoundsMuted();
          }}
        />

        {gameInterface === "ni" ? (
          <SettingsSection
            title={t("sounds.categories.pings.label")}
            description={t("sounds.categories.pings.description")}
          >
            <div className="ll:flex ll:items-center ll:gap-2">
              <CategoryVolumeControl
                icon=<MapPin className="ll:size-4" />
                label={t("sounds.categories.pings.label")}
                volume={localVolumes.pings}
                isMuted={mutedCategories.pings || localVolumes.pings === 0}
                onVolumeChange={(value) => {
                  setLocalVolumes((previous) => ({
                    ...previous,
                    pings: value[0],
                  }));
                  if (value[0] > 0) {
                    setMutedCategories((previous) => ({
                      ...previous,
                      pings: false,
                    }));
                  }
                }}
                onVolumeCommit={(value) =>
                  updateSettings({ pingsVolume: value[0] })
                }
                onMuteToggle={(event) => {
                  event.stopPropagation();
                  const nextVolume =
                    mutedCategories.pings || localVolumes.pings === 0 ? 0.5 : 0;
                  setLocalVolumes((previous) => ({
                    ...previous,
                    pings: nextVolume,
                  }));
                  setMutedCategories((previous) => ({
                    ...previous,
                    pings: nextVolume === 0,
                  }));
                  updateSettings({ pingsVolume: nextVolume });
                }}
                onMuteKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  event.stopPropagation();
                  const nextVolume =
                    mutedCategories.pings || localVolumes.pings === 0 ? 0.5 : 0;
                  setLocalVolumes((previous) => ({
                    ...previous,
                    pings: nextVolume,
                  }));
                  setMutedCategories((previous) => ({
                    ...previous,
                    pings: nextVolume === 0,
                  }));
                  updateSettings({ pingsVolume: nextVolume });
                }}
              />
              <Button
                aria-label={t("sounds.test")}
                className="ll:size-7 ll:p-0"
                onClick={() => playSoundTest("pings", "mapPing")}
                type="button"
                variant="ghost"
              >
                <Play className="ll:size-4" />
              </Button>
            </div>
          </SettingsSection>
        ) : null}

        <SettingsSection
          title={t("sounds.categoriesTitle")}
          description={t("sounds.categoriesDescription")}
        >
          <Accordion
            type="single"
            collapsible
            className="ll:flex ll:w-full ll:flex-col ll:gap-2"
          >
            {categories.map((category) => {
              const configKey = `${category.id}Config` as const;
              const categoryConfig = settings?.[configKey] ?? {};
              const categoryVolume = localVolumes[category.id];
              const isMuted =
                mutedCategories[category.id] || categoryVolume === 0;

              return (
                <CategoryAccordionItem
                  key={category.id}
                  id={category.id}
                  label={category.label}
                  icon={category.icon}
                  volume={categoryVolume}
                  isMuted={isMuted}
                  fields={category.fields}
                  categoryConfig={categoryConfig}
                  urlErrors={urlErrors[category.id] ?? {}}
                  description={category.description}
                  disabled={category.id === "timers"}
                  onVolumeChange={(value) => {
                    const newVolume = value[0];

                    setLocalVolumes((prev) => ({
                      ...prev,
                      [category.id]: newVolume,
                    }));

                    if (newVolume > 0) {
                      setMutedCategories((prev) => ({
                        ...prev,
                        [category.id]: false,
                      }));
                    }
                  }}
                  onVolumeCommit={(value) => {
                    updateSettings({ [`${category.id}Volume`]: value[0] });
                  }}
                  onMuteToggle={(event) => {
                    event.stopPropagation();

                    const isMutedNow =
                      mutedCategories[category.id] || categoryVolume === 0;
                    const newVolume = isMutedNow ? 0.5 : 0;

                    setLocalVolumes((prev) => ({
                      ...prev,
                      [category.id]: newVolume,
                    }));
                    setMutedCategories((prev) => ({
                      ...prev,
                      [category.id]: !isMutedNow,
                    }));
                    updateSettings({ [`${category.id}Volume`]: newVolume });
                  }}
                  onMuteKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") {
                      return;
                    }

                    event.preventDefault();
                    event.stopPropagation();

                    const isMutedNow =
                      mutedCategories[category.id] || categoryVolume === 0;
                    const newVolume = isMutedNow ? 0.5 : 0;

                    setLocalVolumes((prev) => ({
                      ...prev,
                      [category.id]: newVolume,
                    }));
                    setMutedCategories((prev) => ({
                      ...prev,
                      [category.id]: !isMutedNow,
                    }));
                    updateSettings({ [`${category.id}Volume`]: newVolume });
                  }}
                  onSoundUrlChange={(key, soundUrl) => {
                    if (!isValidUrl(soundUrl) && soundUrl.trim() !== "") {
                      setUrlErrors((prev) => ({
                        ...prev,
                        [category.id]: {
                          ...prev[category.id],
                          [key]: t("sounds.invalidUrl"),
                        },
                      }));
                      return;
                    }

                    setUrlErrors((prev) => {
                      const nextErrors = { ...prev };

                      if (nextErrors[category.id]) {
                        delete nextErrors[category.id][key];

                        if (Object.keys(nextErrors[category.id]).length === 0) {
                          delete nextErrors[category.id];
                        }
                      }

                      return nextErrors;
                    });

                    const currentCategoryConfig = settings?.[configKey] ?? {};
                    const currentConfig =
                      currentCategoryConfig[key] ?? DEFAULT_NPC_CONFIG;

                    queueSoundConfigPatch({
                      [configKey]: {
                        [key]: { ...currentConfig, soundUrl },
                      },
                    });
                  }}
                  onPlaySound={(key) => {
                    playSoundTest(
                      category.id,
                      key,
                      categoryConfig[key]?.soundUrl,
                    );
                  }}
                />
              );
            })}
          </Accordion>
        </SettingsSection>
      </div>
    </SettingsTabLayout>
  );
};
