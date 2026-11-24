import { BandSection } from "@lootlog/ui/components/band-section";
import { CheckboxListTile } from "@/components/common/checkbox-list-tile";
import { NPC_TYPES_STRONGEST_FIRST } from "@lootlog/domain/npc-type";
import { FormField, FormLabel } from "@lootlog/ui/components/form";
import type { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { GeneralFormValues } from "./general-form.schema";

type LootDrawSettingsSectionProps = {
  form: UseFormReturn<GeneralFormValues>;
};

export const LootDrawSettingsSection = ({
  form,
}: LootDrawSettingsSectionProps) => {
  const { t } = useTranslation();

  return (
    <FormField
      control={form.control}
      name="lootDrawExcludedNpcTypes"
      render={({ field }) => {
        const excluded: readonly string[] = field.value;

        const drawnCount = NPC_TYPES_STRONGEST_FIRST.filter(
          (type) => !excluded.includes(type),
        ).length;

        return (
          <BandSection
            id="settings-loot-draws"
            title={t("settings.general.lootDraws.title")}
            description={t("settings.general.lootDraws.description")}
            count={`${drawnCount}/${NPC_TYPES_STRONGEST_FIRST.length}`}
            tiled
          >
            {NPC_TYPES_STRONGEST_FIRST.map((type) => (
              <CheckboxListTile
                key={type}
                checked={!excluded.includes(type)}
                onCheckedChange={(checked) =>
                  field.onChange(
                    checked
                      ? field.value.filter((other) => other !== type)
                      : [...field.value, type],
                  )
                }
              >
                <FormLabel className="flex-1 cursor-pointer text-sm font-medium after:absolute after:inset-0">
                  {t(`npcType.${type}`)}
                </FormLabel>
              </CheckboxListTile>
            ))}
          </BandSection>
        );
      }}
    />
  );
};
