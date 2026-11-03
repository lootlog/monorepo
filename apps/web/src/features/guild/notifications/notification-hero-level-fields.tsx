import { FormField, FormItem, FormMessage } from "@lootlog/ui/components/form";
import { LevelRangeInputs } from "@lootlog/ui/components/level-range-inputs";
import { useWatch } from "react-hook-form";
import type { useNotificationRuleForm } from "./hooks/use-notification-rule-form";

type Props = Pick<
  ReturnType<typeof useNotificationRuleForm>,
  "isHeroSighting" | "form" | "t"
>;

/**
 * The optional level range of the heroes a sighting rule announces; an empty
 * bound leaves that side open.
 */
export const NotificationHeroLevelFields = ({
  isHeroSighting,
  form,
  t,
}: Props) => {
  const [npcLevelMin, npcLevelMax] = useWatch({
    control: form.control,
    name: ["npcLevelMin", "npcLevelMax"],
  });

  if (!isHeroSighting) return null;

  const setLevel =
    (name: "npcLevelMin" | "npcLevelMax") => (value: number | undefined) =>
      form.setValue(name, value, { shouldDirty: true, shouldValidate: true });

  return (
    // The order error belongs to the upper bound, which the lower one limits.
    <FormField
      control={form.control}
      name="npcLevelMax"
      render={() => (
        <FormItem>
          <span aria-hidden="true" className="text-sm leading-none font-medium">
            {t("settings.notifications.fields.npcLevel")}
          </span>
          <LevelRangeInputs
            labels={{
              group: t("settings.notifications.fields.npcLevel"),
              min: t("settings.notifications.fields.npcLevelMin"),
              max: t("settings.notifications.fields.npcLevelMax"),
              minPlaceholder: t("ui.levelRange.minPlaceholder"),
              maxPlaceholder: t("ui.levelRange.maxPlaceholder"),
            }}
            minLevel={npcLevelMin}
            maxLevel={npcLevelMax}
            onMinLevelChange={setLevel("npcLevelMin")}
            onMaxLevelChange={setLevel("npcLevelMax")}
            // A form commits on submit, so a typed bound must not wait.
            debounceMs={0}
            size="default"
          />
          <p className="text-xs text-muted-foreground">
            {t("settings.notifications.fields.npcLevelDescription")}
          </p>
          <FormMessage role="alert" />
        </FormItem>
      )}
    />
  );
};
