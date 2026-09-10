import { CreateNotificationRuleDtoScheduleAnchor as NotificationScheduleAnchor } from "@lootlog/client/main";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@lootlog/ui/components/form";
import { Input } from "@lootlog/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import type { useNotificationRuleForm } from "./hooks/use-notification-rule-form";

type Props = Pick<
  ReturnType<typeof useNotificationRuleForm>,
  "isScheduledMessage" | "form" | "t"
>;

export const NotificationTimerFields = ({
  isScheduledMessage,
  form,
  t,
}: Props) => (
  <>
    {!isScheduledMessage ? (
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="scheduleAnchor"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {t("settings.notifications.fields.scheduleAnchor")}
              </FormLabel>
              <Select
                value={field.value}
                onValueChange={(value) => {
                  if (!value) return;
                  field.onChange(value);
                }}
                items={[
                  {
                    value: NotificationScheduleAnchor.MIN_SPAWN,
                    label: (
                      <>
                        {t("settings.notifications.scheduleAnchors.minSpawn")}
                      </>
                    ),
                  },
                  {
                    value: NotificationScheduleAnchor.MAX_SPAWN,
                    label: (
                      <>
                        {t("settings.notifications.scheduleAnchors.maxSpawn")}
                      </>
                    ),
                  },
                ]}
              >
                <FormControl
                  render={
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  }
                />
                <SelectContent>
                  <SelectItem value={NotificationScheduleAnchor.MIN_SPAWN}>
                    {t("settings.notifications.scheduleAnchors.minSpawn")}
                  </SelectItem>
                  <SelectItem value={NotificationScheduleAnchor.MAX_SPAWN}>
                    {t("settings.notifications.scheduleAnchors.maxSpawn")}
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="scheduleOffsetMinutes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {t("settings.notifications.fields.scheduleOffsetMinutes")}
              </FormLabel>
              <FormControl
                render=<Input
                  {...field}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  placeholder={t(
                    "settings.notifications.placeholders.scheduleOffsetMinutes",
                  )}
                />
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    ) : null}
  </>
);
