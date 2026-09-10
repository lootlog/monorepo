import { CreateNotificationRuleDtoTriggerType as NotificationTriggerType } from "@lootlog/client/main";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lootlog/ui/components/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import type { useNotificationRuleForm } from "./hooks/use-notification-rule-form";
import { ALL_WORLDS_VALUE } from "./utils/notification-rule-form.schema";
import { getNotificationTriggerTranslationKey } from "./utils/notification-settings.utils";

type Props = Pick<
  ReturnType<typeof useNotificationRuleForm>,
  "form" | "t" | "getDefaultContentTemplate" | "isScheduledMessage"
>;

export const NotificationTriggerField = ({
  form,
  t,
  getDefaultContentTemplate,
  isScheduledMessage,
}: Props) => (
  <>
    <FormField
      control={form.control}
      name="triggerType"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t("settings.notifications.fields.triggerType")}
          </FormLabel>
          <Select
            value={field.value}
            onValueChange={(value) => {
              if (!value) return;
              field.onChange(value);
              const nextType = value;
              form.setValue(
                "contentTemplate",
                getDefaultContentTemplate(nextType),
              );
              if (nextType === NotificationTriggerType.SCHEDULED_MESSAGE) {
                form.setValue("world", ALL_WORLDS_VALUE);
                form.setValue("npcIds", []);
              } else {
                form.setValue("scheduledAt", "");
              }
            }}
            items={[
              {
                value: NotificationTriggerType.TIMER_BEFORE_SPAWN,
                label: (
                  <>
                    {t(
                      getNotificationTriggerTranslationKey(
                        NotificationTriggerType.TIMER_BEFORE_SPAWN,
                      ),
                    )}
                  </>
                ),
              },
              {
                value: NotificationTriggerType.SCHEDULED_MESSAGE,
                label: (
                  <>
                    {t(
                      getNotificationTriggerTranslationKey(
                        NotificationTriggerType.SCHEDULED_MESSAGE,
                      ),
                    )}
                  </>
                ),
              },
            ]}
          >
            <FormControl
              render={
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {field.value
                      ? t(getNotificationTriggerTranslationKey(field.value))
                      : null}
                  </SelectValue>
                </SelectTrigger>
              }
            />
            <SelectContent>
              <SelectItem value={NotificationTriggerType.TIMER_BEFORE_SPAWN}>
                {t(
                  getNotificationTriggerTranslationKey(
                    NotificationTriggerType.TIMER_BEFORE_SPAWN,
                  ),
                )}
              </SelectItem>
              <SelectItem value={NotificationTriggerType.SCHEDULED_MESSAGE}>
                {t(
                  getNotificationTriggerTranslationKey(
                    NotificationTriggerType.SCHEDULED_MESSAGE,
                  ),
                )}
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {isScheduledMessage
              ? t(
                  "settings.notifications.ruleDialog.triggerDescriptionScheduledMessage",
                )
              : t("settings.notifications.ruleDialog.triggerDescription")}
          </p>
          <FormMessage />
        </FormItem>
      )}
    />
  </>
);
