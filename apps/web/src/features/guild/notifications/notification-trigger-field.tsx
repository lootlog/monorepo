import { OptionCardGroup } from "@/components/common/option-card-group";
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

/** What triggers the rule: a monster's spawn window, or a time of day. */
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
