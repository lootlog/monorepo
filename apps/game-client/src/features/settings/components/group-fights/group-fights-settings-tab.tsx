import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getSettingsDocumentsControllerGetPreferencesQueryKey,
  settingsDocumentsControllerPatchPreferences,
} from "@lootlog/client/main";
import { getCharacterSettingsScopeId } from "@lootlog/domain/settings-documents";
import { SettingsControlRow } from "@/components/settings/settings-control-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Switch } from "@/components/ui/switch";
import { useGroupFightSettings } from "@/hooks/use-group-fight-settings";
import {
  groupFightCollectionEnabled,
  getGroupFightSettingsParams,
} from "@/lib/group-fight-settings";
import { queryClient } from "@/lib/query-client";

export function GroupFightsSettingsTab() {
  const { t } = useTranslation();
  const settings = useGroupFightSettings();
  const [saving, setSaving] = useState(false);
  const save = async (enabled: boolean) => {
    const params = getGroupFightSettingsParams();
    if (saving || !params.gameAccountId || !params.characterId) return;
    setSaving(true);
    try {
      await settingsDocumentsControllerPatchPreferences({
        operations: [
          {
            domain: "gameData",
            scope: {
              type: "CHARACTER",
              id: getCharacterSettingsScopeId(
                params.gameAccountId,
                params.characterId,
              ),
            },
            set: { groupFights: { enabled } },
            unset: [],
          },
        ],
      });
      await queryClient.invalidateQueries({
        queryKey: getSettingsDocumentsControllerGetPreferencesQueryKey(params),
      });
    } catch {
      toast.error(t("settings.groupFights.saveError"));
    } finally {
      setSaving(false);
    }
  };
  return (
    <SettingsTabLayout
      title={t("settings.groupFights.title")}
      description={t("settings.groupFights.description")}
    >
      <SettingsSection title={t("settings.groupFights.title")}>
        <SettingsControlRow
          label={t("settings.groupFights.enabled")}
          description={t("settings.groupFights.collectionDescription")}
        >
          <Switch
            id="group-fights-enabled"
            aria-label={t("settings.groupFights.enabled")}
            checked={groupFightCollectionEnabled(settings.data)}
            disabled={saving || !settings.isSuccess}
            onCheckedChange={(enabled) => void save(enabled)}
          />
        </SettingsControlRow>
        {settings.isError ? (
          <p role="alert">{t("settings.groupFights.loadError")}</p>
        ) : null}
      </SettingsSection>
    </SettingsTabLayout>
  );
}
