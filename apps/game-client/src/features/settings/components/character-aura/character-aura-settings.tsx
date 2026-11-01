import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  characterAurasControllerUpdateOwnAura,
  getCharacterAurasControllerGetAurasQueryKey,
  getCharacterAurasControllerGetOwnAuraQueryKey,
} from "@lootlog/client/main";
import {
  CHARACTER_AURA_IDS,
  type CharacterAuraId,
} from "@lootlog/schema/character-aura";
import {
  SettingsChoiceCards,
  type SettingsChoiceOption,
} from "@/components/settings/settings-choice-card";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { useOwnCharacterAura } from "@/features/character-auras/hooks/use-own-character-aura";
import { reportSettingsSave } from "@/features/settings/persistence/settings-save-status.store";

const NO_AURA = "none";

type AuraChoice = CharacterAuraId | typeof NO_AURA;

export const CharacterAuraSettings = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: own } = useOwnCharacterAura();

  const mutation = useMutation({
    mutationFn: (auraId: CharacterAuraId | null) =>
      characterAurasControllerUpdateOwnAura({ auraId }),
    onMutate: () => reportSettingsSave.saving(),
    onSuccess: (updated) => {
      queryClient.setQueryData(
        getCharacterAurasControllerGetOwnAuraQueryKey(),
        updated,
      );
      reportSettingsSave.saved();

      return queryClient.invalidateQueries({
        queryKey: getCharacterAurasControllerGetAurasQueryKey(),
      });
    },
    onError: (_error, auraId) =>
      reportSettingsSave.failed(() => mutation.mutate(auraId)),
  });

  const options: SettingsChoiceOption<AuraChoice>[] = [
    { value: NO_AURA, title: t("settings.characterAura.none") },
    ...CHARACTER_AURA_IDS.map((id) => ({
      value: id,
      title: t(`settings.characterAura.auras.${id}`),
      // Removing an aura stays possible after access to choosing one ends.
      disabled: !own?.canChange,
    })),
  ];

  const value: AuraChoice | null = own
    ? ((mutation.isPending ? mutation.variables : own.auraId) ?? NO_AURA)
    : null;

  return (
    <SettingsTabLayout>
      <SettingsSection
        controlId="character-aura"
        title={t("settings.characterAura.title")}
        description={t("settings.characterAura.description")}
      >
        <SettingsChoiceCards
          label={t("settings.characterAura.title")}
          options={options}
          value={value}
          disabled={!own || mutation.isPending}
          onChange={(choice) =>
            mutation.mutate(choice === NO_AURA ? null : choice)
          }
        />
      </SettingsSection>
    </SettingsTabLayout>
  );
};
