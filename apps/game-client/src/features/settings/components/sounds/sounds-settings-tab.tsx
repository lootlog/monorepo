import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsIconButton } from "@/components/settings/settings-icon-button";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { SettingsVolumeControl } from "@/components/settings/settings-volume-row";
import { getDefaultSoundUrl } from "@/features/settings/config/default-sounds";
import { Play } from "lucide-react";
import { SoundCategorySection } from "./sound-category-section";
import { SoundFieldInput } from "./sound-field-input";
import { useSoundSettingsForm } from "./use-sound-settings-form";

const DEFAULT_NPC_CONFIG = { volume: 0.5, soundUrl: "" };

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
    volumes,
    setVolume,
    commitVolume,
    toggleMuted,
    urlErrors,
    setUrlErrors,
    categories,
  } = useSoundSettingsForm();

  if (isLoading) {
    return (
      <SettingsTabLayout>
        <SettingsEmptyState>{t("settings.sounds.loading")}</SettingsEmptyState>
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

            const { [key]: _removed, ...remaining } = errors;
            const { [category.id]: _previous, ...others } = previous;

            return Object.keys(remaining).length > 0
              ? { ...others, [category.id]: remaining }
              : others;
          });

          const currentConfig = categoryConfig[key] ?? DEFAULT_NPC_CONFIG;

          // The shared settings patch queue debounces and merges these.
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
            onVolumeChange={(value) => setVolume(category.id, value)}
            onVolumeCommit={(value) => commitVolume(category.id, value)}
            onMuteToggle={() => toggleMuted(category.id)}
          >
            {category.fields.map((field) => {
              const soundUrl = categoryConfig[field.key]?.soundUrl ?? "";

              return (
                <SoundFieldInput
                  key={field.key}
                  category={category.id}
                  fieldKey={field.key}
                  label={field.label}
                  soundUrl={soundUrl}
                  placeholder={getDefaultSoundUrl(field.key)}
                  error={categoryErrors[field.key]}
                  onSoundUrlChange={(value) => setSoundUrl(field.key, value)}
                  onPlaySound={() =>
                    playSoundTest(category.id, field.key, soundUrl)
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
          onVolumeChange={(value) => setVolume("pings", value)}
          onVolumeCommit={(value) => commitVolume("pings", value)}
          onMuteToggle={() => toggleMuted("pings")}
          actions={
            <SettingsIconButton
              label={t("common:actions.playSound")}
              onClick={() => playSoundTest("pings", "mapPing")}
            >
              <Play aria-hidden />
            </SettingsIconButton>
          }
        />
      ) : null}
    </SettingsTabLayout>
  );
}
