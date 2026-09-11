import { SettingsCategoryAccordion } from "@/components/settings/settings-category-accordion";
import { SettingsIconButton } from "@/components/settings/settings-icon-button";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { SettingsVolumeControl } from "@/components/settings/settings-volume-row";
import { Play } from "lucide-react";
import { CategoryAccordionItem } from "./category-accordion-item";
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
      <SettingsTabLayout>
        <p className="ll:m-0 ll:px-2 ll:text-xs ll:text-muted-foreground">
          {t("settings.sounds.loading")}
        </p>
      </SettingsTabLayout>
    );
  }

  const muteLabel = t("common:actions.mute");
  const unmuteLabel = t("common:actions.unmute");
  const pingsMuted = mutedCategories.pings || localVolumes.pings === 0;

  return (
    <SettingsTabLayout>
      <SettingsSection title={t("settings.sounds.volumeTitle")}>
        <SettingsRow
          controlId="sound-master-volume"
          label={t("settings.sounds.masterVolume")}
          controlClassName="ll:w-56"
        >
          <SettingsVolumeControl
            label={t("settings.sounds.masterVolume")}
            muteLabel={muteLabel}
            unmuteLabel={unmuteLabel}
            volume={masterVolume}
            muted={soundsMuted}
            onVolumeChange={setMasterVolume}
            onVolumeCommit={setMasterVolume}
            onMuteToggle={() => {
              toggleSoundsMuted();
            }}
          />
        </SettingsRow>

        {gameInterface === "ni" ? (
          <SettingsRow
            label={t("settings.sounds.categories.pings.label")}
            controlClassName="ll:w-56 ll:gap-1"
          >
            <SettingsVolumeControl
              label={t("settings.sounds.categories.pings.label")}
              muteLabel={muteLabel}
              unmuteLabel={unmuteLabel}
              volume={localVolumes.pings}
              muted={pingsMuted}
              onVolumeChange={(value) => {
                setLocalVolumes((previous) => ({
                  ...previous,
                  pings: value,
                }));

                if (value > 0) {
                  setMutedCategories((previous) => ({
                    ...previous,
                    pings: false,
                  }));
                }
              }}
              onVolumeCommit={(value) => updateSettings({ pingsVolume: value })}
              onMuteToggle={() => {
                const nextVolume = pingsMuted ? 0.5 : 0;

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
            <SettingsIconButton
              label={t("common:actions.playSound")}
              onClick={() => playSoundTest("pings", "mapPing")}
            >
              <Play aria-hidden />
            </SettingsIconButton>
          </SettingsRow>
        ) : null}
      </SettingsSection>

      <SettingsSection
        controlId="sound-categories"
        title={t("settings.sounds.categoriesTitle")}
        description={t("settings.sounds.categoriesDescription")}
      >
        <SettingsCategoryAccordion className="ll:px-2">
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
                icon=<category.icon className="ll:size-3.5" aria-hidden />
                volume={categoryVolume}
                isMuted={isMuted}
                fields={category.fields}
                categoryConfig={categoryConfig}
                urlErrors={urlErrors[category.id] ?? {}}
                onVolumeChange={(value) => {
                  setLocalVolumes((prev) => ({
                    ...prev,
                    [category.id]: value,
                  }));

                  if (value > 0) {
                    setMutedCategories((prev) => ({
                      ...prev,
                      [category.id]: false,
                    }));
                  }
                }}
                onVolumeCommit={(value) => {
                  updateSettings({ [`${category.id}Volume`]: value });
                }}
                onMuteToggle={() => {
                  const newVolume = isMuted ? 0.5 : 0;

                  setLocalVolumes((prev) => ({
                    ...prev,
                    [category.id]: newVolume,
                  }));
                  setMutedCategories((prev) => ({
                    ...prev,
                    [category.id]: !isMuted,
                  }));
                  updateSettings({ [`${category.id}Volume`]: newVolume });
                }}
                onSoundUrlChange={(key, soundUrl) => {
                  if (!isValidUrl(soundUrl) && soundUrl.trim() !== "") {
                    const message = t("settings.sounds.invalidUrl");
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
        </SettingsCategoryAccordion>
      </SettingsSection>
    </SettingsTabLayout>
  );
}
