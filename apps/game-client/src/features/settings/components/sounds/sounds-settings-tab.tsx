import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Accordion } from "@/components/ui/accordion";
import { Loader2, MapPin, Play } from "lucide-react";
import { CategoryAccordionItem } from "./category-accordion-item";
import { MasterVolumeControl } from "./master-volume-control";
import { CategoryVolumeControl } from "./category-volume-control";
import { Button } from "@/components/ui/button";
import { useSoundSettingsForm } from "./use-sound-settings-form";

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

export function SoundsSettingsTab() {
  const {
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
  } = useSoundSettingsForm();

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
                  icon=<category.icon className="ll:size-4" />
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
                  onSoundUrlChange={(key, soundUrl) => {
                    if (!isValidUrl(soundUrl) && soundUrl.trim() !== "") {
                      const message = t("sounds.invalidUrl");
                      setUrlErrors((prev) => ({
                        ...prev,
                        [category.id]: {
                          ...prev[category.id],
                          [key]: message,
                        },
                      }));

                      return;
                    }

                    setUrlErrors((prev) => {
                      const categoryErrors = prev[category.id];

                      if (!categoryErrors || !(key in categoryErrors))
                        return prev;

                      const { [key]: _removedError, ...remainingErrors } =
                        categoryErrors;

                      const {
                        [category.id]: _previousCategory,
                        ...otherCategories
                      } = prev;

                      return Object.keys(remainingErrors).length > 0
                        ? { ...otherCategories, [category.id]: remainingErrors }
                        : otherCategories;
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
}
