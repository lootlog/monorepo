import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  characterAurasControllerUpdateOwnAura,
  getCharacterAurasControllerGetAurasQueryKey,
  getCharacterAurasControllerGetOwnAuraQueryKey,
} from "@lootlog/client/main";
import {
  CHARACTER_AURA_IDS,
  isAdminCharacterAuraId,
  isPersonalCharacterAuraId,
  type CharacterAuraId,
} from "@lootlog/schema/character-aura";
import type { SettingsChoiceOption } from "@/components/settings/settings-choice-card";
import { SettingsChoiceCards } from "@/components/settings/settings-choice-cards";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { ownAuraOf } from "@/features/character-auras/character-aura-targets";
import { useOwnCharacterAura } from "@/features/character-auras/hooks/use-own-character-aura";
import { reportSettingsSave } from "@/features/settings/persistence/settings-save-status.store";
import { useGameStore } from "@/store/game.store";

const NO_AURA = "none";

type AuraChoice = CharacterAuraId | typeof NO_AURA;

export const CharacterAuraSettings = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: own } = useOwnCharacterAura({ refetchOnMount: "always" });
  const accountId = useGameStore((state) => state.game?.hero.accountId);
  const characterId = useGameStore((state) => state.game?.hero.characterId);

  // The aura belongs to the character the User plays now.
  const hero =
    accountId && characterId ? { accountId, characterId } : undefined;

  const heroAura = ownAuraOf(own, hero);

  const mutation = useMutation({
    mutationFn: ({
      character,
      auraId,
    }: {
      character: { accountId: string; characterId: string };
      auraId: CharacterAuraId | null;
    }) =>
      characterAurasControllerUpdateOwnAura({
        gameAccountId: character.accountId,
        characterId: character.characterId,
        auraId,
      }),
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
    onError: (_error, variables) =>
      reportSettingsSave.failed(() => mutation.mutate(variables)),
  });

  // Admin auras are the admins' own, a personal aura its holders'; the rest
  // come with access to auras in general.
  const mayChoose = (id: CharacterAuraId) => {
    if (isAdminCharacterAuraId(id)) return own?.canGrant ?? false;

    if (isPersonalCharacterAuraId(id))
      return own?.personalAuraIds.includes(id) ?? false;

    return own?.canChange ?? false;
  };

  const options: SettingsChoiceOption<AuraChoice>[] = [
    { value: NO_AURA, title: t("settings.characterAura.none") },
    // Admin and personal auras are offered to those who may choose them, and
    // to anyone still wearing one.
    ...CHARACTER_AURA_IDS.filter(
      (id) =>
        !(isAdminCharacterAuraId(id) || isPersonalCharacterAuraId(id)) ||
        mayChoose(id) ||
        heroAura === id,
    ).map((id) => ({
      value: id,
      title: t(`settings.characterAura.auras.${id}`),
      // Removing an aura stays possible after access to choosing one ends.
      disabled: !mayChoose(id),
    })),
  ];

  const value: AuraChoice | null = own
    ? ((mutation.isPending ? mutation.variables?.auraId : heroAura) ?? NO_AURA)
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
          disabled={!own || !hero || mutation.isPending}
          onChange={(choice) => {
            if (!hero) return;

            mutation.mutate({
              character: hero,
              auraId: choice === NO_AURA ? null : choice,
            });
          }}
        />
      </SettingsSection>
    </SettingsTabLayout>
  );
};
