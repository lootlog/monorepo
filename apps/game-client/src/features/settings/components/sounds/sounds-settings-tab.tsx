import { Accordion } from "@/components/ui/accordion";
import {
  useSoundSettings,
  useUpdateSoundSettings,
} from "@/hooks/api/use-sound-settings";
import { NpcType } from "@/hooks/api/use-npcs";
import React, { useCallback, useState, type FC } from "react";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { useSoundPlayback } from "@/hooks/use-sound-playback";
import { Bell, Crosshair, Clock, Loader2 } from "lucide-react";
import { MasterVolumeControl } from "./master-volume-control";
import { CategoryAccordionItem } from "./category-accordion-item";
import type { SoundCategory } from "./types";

const allNpcTypes = [
  { label: "Komunikaty", key: "message" },
  { label: "Elita 2", key: NpcType.ELITE2 },
  { label: "Heros", key: NpcType.HERO },
  { label: "Kolos", key: NpcType.COLOSSUS },
  { label: "Tytan", key: NpcType.TITAN },
] as const;

const notificationNpcTypes = allNpcTypes;

const detectorTimerNpcTypes = allNpcTypes.filter(
  (field) => field.key !== "message",
);

const DEFAULT_NPC_CONFIG = { volume: 0.5, soundUrl: "" };

const isValidUrl = (url: string): boolean => {
  if (!url || url.trim() === "") return true;

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

  const debouncedUpdate = useDebouncedCallback(
    (payload: Parameters<typeof updateSettings>[0]) => {
      updateSettings(payload);
    },
    300,
  );

  const { playSoundTest } = useSoundPlayback();

  React.useEffect(() => {
    if (settings) {
      setLocalVolumes({
        master: settings.masterVolume ?? 0.5,
        notifications: settings.notificationsVolume ?? 0.5,
        detector: settings.detectorVolume ?? 0.5,
        timers: settings.timersVolume ?? 0.5,
      });
    }
  }, [settings]);

  const handleMasterVolumeChange = useCallback((value: number[]) => {
    setLocalVolumes((prev) => ({ ...prev, master: value[0] }));
  }, []);

  const handleMasterVolumeCommit = useCallback(
    (value: number[]) => {
      updateSettings({ masterVolume: value[0] });
    },
    [updateSettings],
  );

  const handleMasterMuteToggle = useCallback(() => {
    const currentVolume = localVolumes.master;
    const newVolume = currentVolume > 0 ? 0 : 0.5;
    setLocalVolumes((prev) => ({ ...prev, master: newVolume }));
    updateSettings({ masterVolume: newVolume });
  }, [localVolumes.master, updateSettings]);

  const handleCategoryVolumeChange = useCallback(
    (category: SoundCategory, value: number[]) => {
      const newVolume = value[0];
      setLocalVolumes((prev) => ({ ...prev, [category]: newVolume }));
      if (newVolume > 0) {
        setMutedCategories((prev) => ({ ...prev, [category]: false }));
      }
    },
    [],
  );

  const handleCategoryVolumeCommit = useCallback(
    (category: SoundCategory, value: number[]) => {
      updateSettings({ [`${category}Volume`]: value[0] });
    },
    [updateSettings],
  );

  const handleCategoryMuteToggle = useCallback(
    (category: SoundCategory, e: React.MouseEvent) => {
      e.stopPropagation();
      const currentVolume = localVolumes[category];
      const isMuted = mutedCategories[category] || currentVolume === 0;
      const newVolume = isMuted ? 0.5 : 0;

      setLocalVolumes((prev) => ({ ...prev, [category]: newVolume }));
      setMutedCategories((prev) => ({ ...prev, [category]: !isMuted }));
      updateSettings({ [`${category}Volume`]: newVolume });
    },
    [localVolumes, mutedCategories, updateSettings],
  );

  const handleSoundUrlChange = useCallback(
    (category: SoundCategory, key: string, soundUrl: string) => {
      if (!isValidUrl(soundUrl) || soundUrl.trim() !== "") {
        setUrlErrors((prev) => ({
          ...prev,
          [category]: {
            ...prev[category],
            [key]: "Nieprawidłowy URL",
          },
        }));
        return;
      }

      setUrlErrors((prev) => {
        const newErrors = { ...prev };
        if (newErrors[category]) {
          delete newErrors[category][key];
          if (Object.keys(newErrors[category]).length === 0) {
            delete newErrors[category];
          }
        }
        return newErrors;
      });

      const configKey = `${category}Config` as const;
      const currentCategoryConfig = settings?.[configKey] ?? {};
      const currentConfig = currentCategoryConfig[key] ?? DEFAULT_NPC_CONFIG;
      debouncedUpdate({
        [configKey]: {
          [key]: { ...currentConfig, soundUrl },
        },
      });
    },
    [settings, debouncedUpdate],
  );

  if (isLoading) {
    return (
      <div className="ll:w-full ll:pt-2 ll:flex ll:items-center ll:justify-center">
        <p className="ll:text-muted-foreground">Ładowanie ustawień...</p>
      </div>
    );
  }

  const categories: {
    id: SoundCategory;
    label: string;
    icon: React.ReactNode;
    fields: typeof allNpcTypes | typeof detectorTimerNpcTypes;
    description?: string;
  }[] = [
    {
      id: "notifications",
      label: "Powiadomienia",
      icon: <Bell className="ll:size-4" />,
      fields: notificationNpcTypes,
      description: "Dźwięki odgrywane są przy różnych powiadomieniach.",
    },
    {
      id: "detector",
      label: "Wykrywacz",
      icon: <Crosshair className="ll:size-4" />,
      fields: detectorTimerNpcTypes,
      description: "Dźwięki odgrywane są, gdy wykrywacz znajdzie NPC.",
    },
    {
      id: "timers",
      label: "Timery",
      icon: <Clock className="ll:size-4" />,
      fields: detectorTimerNpcTypes,
      description:
        "Dźwięki odgrywane są, gdy timer wejdzie na minimalny czas respawnu.",
    },
  ];

  return (
    <div className="ll:w-full ll:pt-2 ll:relative">
      {isPending && (
        <div className="ll:absolute ll:top-2 ll:right-2">
          <Loader2 className="ll:size-4 ll:animate-spin ll:text-primary" />
        </div>
      )}
      <h2 className="ll:text-sm">Ustawienia dźwięków</h2>
      <p className="ll:text-gray-400 ll:mb-4">
        Skonfiguruj dźwięki dla różnych funkcji.
      </p>

      <div className="ll:flex ll:flex-col ll:gap-3 ll:pb-6 ll:pr-1">
        <MasterVolumeControl
          volume={localVolumes.master}
          onVolumeChange={handleMasterVolumeChange}
          onVolumeCommit={handleMasterVolumeCommit}
          onMuteToggle={handleMasterMuteToggle}
        />

        <div className="ll:flex ll:flex-col ll:gap-1 ll:mt-2">
          <h3 className="ll:text-sm ll:font-medium">Kategorie dźwięków</h3>
          <p className="ll:text-xs ll:text-muted-foreground ll:mb-2">
            Dostosuj głośność i dźwięki dla każdej kategorii osobno.
          </p>
        </div>

        <Accordion
          type="single"
          collapsible
          className="ll:w-full ll:flex ll:flex-col ll:gap-1"
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
                onVolumeChange={(v) =>
                  handleCategoryVolumeChange(category.id, v)
                }
                onVolumeCommit={(v) =>
                  handleCategoryVolumeCommit(category.id, v)
                }
                onMuteToggle={(e) => handleCategoryMuteToggle(category.id, e)}
                onMuteKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    const currentVolume = localVolumes[category.id];
                    const isMutedNow =
                      mutedCategories[category.id] || currentVolume === 0;
                    const newVolume = isMutedNow ? 0.5 : 0;

                    setLocalVolumes((prev) => ({
                      ...prev,
                      [category.id]: newVolume,
                    }));
                    setMutedCategories((prev) => ({
                      ...prev,
                      [category.id]: !isMutedNow,
                    }));
                    updateSettings({
                      [`${category.id}Volume`]: newVolume,
                    });
                  }
                }}
                onSoundUrlChange={(key, value) =>
                  handleSoundUrlChange(category.id, key, value)
                }
                onPlaySound={(key) => {
                  const soundUrl = categoryConfig[key]?.soundUrl;
                  playSoundTest(category.id, key, soundUrl);
                }}
              />
            );
          })}
        </Accordion>
      </div>
    </div>
  );
};
