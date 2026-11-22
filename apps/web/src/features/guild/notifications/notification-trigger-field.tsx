import { OptionCardGroup } from "@lootlog/ui/components/option-card-group";
import { CreateNotificationRuleDtoTriggerType as NotificationTriggerType } from "@lootlog/client/main";
import { useId } from "react";
import { useWatch } from "react-hook-form";
import { ALL_WORLDS_VALUE } from "./utils/notification-rule-form.schema";
import { getNotificationTriggerTranslationKey } from "./utils/notification-settings.utils";
import type { useNotificationRuleForm } from "./hooks/use-notification-rule-form";

type Props = Pick<
  ReturnType<typeof useNotificationRuleForm>,
  "form" | "t" | "getDefaultContentTemplate"
>;

/**
 * What triggers the rule: a monster's spawn window, a hero sighting, a loot
 * draw's result, or a time of day.
 */
export const NotificationTriggerField = ({
  form,
  t,
  getDefaultContentTemplate,
}: Props) => {
  const labelId = useId();
  const value = useWatch({ control: form.control, name: "triggerType" });

  const changeTrigger = (nextType: NotificationTriggerType) => {
    if (nextType === value) return;

    form.setValue("triggerType", nextType, { shouldDirty: true });
    form.setValue("contentTemplate", getDefaultContentTemplate(nextType));

    if (nextType === NotificationTriggerType.SCHEDULED_MESSAGE) {
      form.setValue("world", ALL_WORLDS_VALUE);
      form.setValue("npcIds", []);
    } else {
      form.setValue("scheduledAt", "");
    }

    // Neither a sighting nor a draw is about chosen monsters.
    if (
      nextType === NotificationTriggerType.HERO_SIGHTED ||
      nextType === NotificationTriggerType.LOOT_DRAW_RESOLVED
    ) {
      form.setValue("npcIds", []);
      form.setValue("manualNpcIds", "");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span id={labelId} className="text-sm font-medium">
        {t("settings.notifications.fields.triggerType")}
      </span>
      <OptionCardGroup
        aria-labelledby={labelId}
        value={value}
        onChange={changeTrigger}
        options={[
          {
            value: NotificationTriggerType.TIMER_BEFORE_SPAWN,
            title: t(
              getNotificationTriggerTranslationKey(
                NotificationTriggerType.TIMER_BEFORE_SPAWN,
              ),
            ),
            description: t(
              "settings.notifications.ruleDialog.triggerOptions.timerBeforeSpawn",
            ),
          },
          {
            value: NotificationTriggerType.HERO_SIGHTED,
            title: t(
              getNotificationTriggerTranslationKey(
                NotificationTriggerType.HERO_SIGHTED,
              ),
            ),
            description: t(
              "settings.notifications.ruleDialog.triggerOptions.heroSighted",
            ),
          },
          {
            value: NotificationTriggerType.LOOT_DRAW_RESOLVED,
            title: t(
              getNotificationTriggerTranslationKey(
                NotificationTriggerType.LOOT_DRAW_RESOLVED,
              ),
            ),
            description: t(
              "settings.notifications.ruleDialog.triggerOptions.lootDrawResolved",
            ),
          },
          {
            value: NotificationTriggerType.SCHEDULED_MESSAGE,
            title: t(
              getNotificationTriggerTranslationKey(
                NotificationTriggerType.SCHEDULED_MESSAGE,
              ),
            ),
            description: t(
              "settings.notifications.ruleDialog.triggerOptions.scheduledMessage",
            ),
          },
        ]}
      />
    </div>
  );
};
