import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Accordion } from "@/components/ui/accordion";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { NpcType } from "@/hooks/api/use-npcs";
import {
  useSoundSettings,
  useUpdateSoundSettings,
} from "@/hooks/api/use-sound-settings";
import { useSoundPlayback } from "@/hooks/use-sound-playback";
import type { SoundCategory } from "@/features/settings/components/sounds/types";
import { Bell, Clock, Crosshair, Loader2 } from "lucide-react";
import { useEffect, useState, type FC, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CategoryAccordionItem } from "./category-accordion-item";
import { MasterVolumeControl } from "./master-volume-control";

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
  const { data: settings, isLoading } = useSoundSettings();
  const { mutate: updateSettings, isPending } = useUpdateSoundSettings();
  const { playSoundTest } = useSoundPlayback();
  const { t } = useTranslation(["settings", "common"]);
  const [mutedCategories, setMutedCategories] = useState<
    Record<SoundCategory, boolean>
  >({
    notifications: false,
    detector: false,
    timers: false,
  });
  const [localVolumes, setLocalVolumes] = useState({
    master: 0.5,
    notifications: 0.5,
    detector: 0.5,
    timers: 0.5,
  });
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
    id: SoundCategory;
    label: string;
    icon: ReactNode;
    fields: typeof notificationNpcTypes | typeof detectorTimerNpcTypes;
    description: string;
  }[] = [
    {
      id: "notifications",
      label: t("settings.sounds.categories.notifications.label"),
      icon: <Bell className="ll:size-4" />,
      fields: notificationNpcTypes,
      description: t("settings.sounds.categories.notifications.description"),
    },
    {
      id: "detector",
      label: t("settings.sounds.categories.detector.label"),
      icon: <Crosshair className="ll:size-4" />,
      fields: detectorTimerNpcTypes,
      description: t("settings.sounds.categories.detector.description"),
    },
    {
      id: "timers",
      label: t("settings.sounds.categories.timers.label"),
      icon: <Clock className="ll:size-4" />,
      fields: detectorTimerNpcTypes,
      description: t("settings.sounds.categories.timers.description"),
    },
  ];
  const debouncedUpdate = useDebouncedCallback(
    (payload: Parameters<typeof updateSettings>[0]) => {
      updateSettings(payload);
    },
    300,
  );

  useEffect(() => {
    if (!settings) {
      return;
    }

    setLocalVolumes({
      master: settings.masterVolume ?? 0.5,
      notifications: settings.notificationsVolume ?? 0.5,
      detector: settings.detectorVolume ?? 0.5,
      timers: settings.timersVolume ?? 0.5,
    });
  }, [settings]);

  if (isLoading) {
    return (
      <SettingsTabLayout title={t("settings.sounds.title")}>
        <p className="ll:text-[12px] ll:text-gray-400">
          {t("settings.sounds.loading")}
        </p>
      </SettingsTabLayout>
    );
  }

  return (
    <SettingsTabLayout
      title={t("settings.sounds.title")}
      description={t("settings.sounds.description")}
      className="ll:relative"
    >
      {isPending ? (
        <div className="ll:absolute ll:top-2 ll:right-2">
          <Loader2 className="ll:size-4 ll:animate-spin ll:text-primary" />
        </div>
      ) : null}
      <div className="ll:flex ll:flex-col ll:gap-4 ll:pb-6 ll:pr-1">
        <MasterVolumeControl
          volume={localVolumes.master}
          onVolumeChange={(value) => {
            setLocalVolumes((prev) => ({ ...prev, master: value[0] }));
          }}
          onVolumeCommit={(value) => {
            updateSettings({ masterVolume: value[0] });
          }}
          onMuteToggle={() => {
            const newVolume = localVolumes.master > 0 ? 0 : 0.5;

            setLocalVolumes((prev) => ({ ...prev, master: newVolume }));
            updateSettings({ masterVolume: newVolume });
          }}
        />

        <SettingsSection
          title={t("settings.sounds.categoriesTitle")}
          description={t("settings.sounds.categoriesDescription")}
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
                          [key]: t("settings.sounds.invalidUrl"),
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

                    debouncedUpdate({
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
