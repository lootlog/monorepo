import { getNotificationFieldVisibility } from "./utils/notification-field-visibility";
import { CreateNotificationRuleDtoScheduleIntervalType as NotificationScheduleIntervalType } from "@lootlog/client/main";
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
import {
  formatDateTimeLocalInputValue,
  GUILD_NOTIFICATION_TIMEZONE,
} from "./utils/notification-schedule-time.utils";

type Props = Pick<ReturnType<typeof useNotificationRuleForm>, "form" | "t">;

export const NotificationScheduleFields = ({ form, t }: Props) => {
  const {
    isScheduledMessage,
    isRecurring,
    showScheduledAtField,
    showTimeOfDayField,
    showWeekdayField,
    showIntervalValueField,
  } = getNotificationFieldVisibility(
    form.watch("triggerType"),
    form.watch("scheduleIntervalType"),
  );
  return (
    <>
      {isScheduledMessage ? (
        <>
          <FormField
            control={form.control}
            name="scheduleIntervalType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {t("settings.notifications.fields.scheduleIntervalType")}
                </FormLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    if (!value) return;
                    field.onChange(value);
                  }}
                  items={[
                    {
                      value: NotificationScheduleIntervalType.ONCE,
                      label: (
                        <>{t("settings.notifications.intervalTypes.once")}</>
                      ),
                    },
                    {
                      value: NotificationScheduleIntervalType.HOURLY,
                      label: (
                        <>{t("settings.notifications.intervalTypes.hourly")}</>
                      ),
                    },
                    {
                      value: NotificationScheduleIntervalType.DAILY,
                      label: (
                        <>{t("settings.notifications.intervalTypes.daily")}</>
                      ),
                    },
                    {
                      value: NotificationScheduleIntervalType.WEEKLY,
                      label: (
                        <>{t("settings.notifications.intervalTypes.weekly")}</>
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
                    <SelectItem value={NotificationScheduleIntervalType.ONCE}>
                      {t("settings.notifications.intervalTypes.once")}
                    </SelectItem>
                    <SelectItem value={NotificationScheduleIntervalType.HOURLY}>
                      {t("settings.notifications.intervalTypes.hourly")}
                    </SelectItem>
                    <SelectItem value={NotificationScheduleIntervalType.DAILY}>
                      {t("settings.notifications.intervalTypes.daily")}
                    </SelectItem>
                    <SelectItem value={NotificationScheduleIntervalType.WEEKLY}>
                      {t("settings.notifications.intervalTypes.weekly")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {showIntervalValueField ? (
            <FormField
              control={form.control}
              name="scheduleIntervalValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {t("settings.notifications.fields.scheduleIntervalValue")}
                  </FormLabel>
                  <FormControl
                    render=<Input
                      {...field}
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="24"
                      step="1"
                    />
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}

          {showWeekdayField ? (
            <FormField
              control={form.control}
              name="scheduleWeekday"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {t("settings.notifications.fields.scheduleWeekday")}
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      if (!value) return;
                      field.onChange(value);
                    }}
                    items={[0, 1, 2, 3, 4, 5, 6].map((day) => ({
                      value: String(day),
                      label: <>{t(`settings.notifications.weekdays.${day}`)}</>,
                    }))}
                  >
                    <FormControl
                      render={
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      }
                    />
                    <SelectContent>
                      {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                        <SelectItem key={day} value={String(day)}>
                          {t(`settings.notifications.weekdays.${day}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}

          {showTimeOfDayField ? (
            <FormField
              control={form.control}
              name="scheduleTimeOfDay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {t("settings.notifications.fields.scheduleTimeOfDay")}
                  </FormLabel>
                  <FormControl
                    render=<Input
                      {...field}
                      type="time"
                      placeholder={t(
                        "settings.notifications.placeholders.scheduleTimeOfDay",
                      )}
                    />
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}

          {showScheduledAtField ? (
            <FormField
              control={form.control}
              name="scheduledAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {t("settings.notifications.fields.scheduledAt")}
                  </FormLabel>
                  <FormControl
                    render=<Input
                      {...field}
                      type="datetime-local"
                      min={formatDateTimeLocalInputValue(
                        new Date().toISOString(),
                        GUILD_NOTIFICATION_TIMEZONE,
                      )}
                    />
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}

          {isRecurring ? (
            <FormField
              control={form.control}
              name="scheduledUntil"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {t("settings.notifications.fields.scheduledUntil")}
                  </FormLabel>
                  <FormControl
                    render=<Input
                      {...field}
                      type="datetime-local"
                      placeholder={t(
                        "settings.notifications.placeholders.scheduledUntil",
                      )}
                    />
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
        </>
      ) : null}
    </>
  );
};
