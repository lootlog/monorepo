import { TextLink } from "@lootlog/ui/components/text-link";
import { useId } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { ReservationSettings } from "@lootlog/domain/reservations";
import { useNotificationsUserControllerGetUserTargets } from "@lootlog/client/main";
import { DateTimePicker } from "@lootlog/ui/components/date-time-picker";
import { Label } from "@lootlog/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { Textarea } from "@lootlog/ui/components/textarea";
import { ROUTES } from "@/config/routes";

export type ReminderValue = "none" | "0" | "5" | "15" | "30";
export type ReminderOffset = 0 | 5 | 15 | 30;
const REMINDER_VALUES: ReminderValue[] = ["none", "0", "5", "15", "30"];
export const toReminderOffset = (
  value: ReminderValue,
): ReminderOffset | null =>
  value === "none" ? null : (Number(value) as ReminderOffset);

type ReservationFormFieldsProps = {
  settings: ReservationSettings;
  startsAt: Date | undefined;
  endsAt: Date | undefined;
  setStartsAt: (date: Date | undefined) => void;
  setEndsAt: (date: Date | undefined) => void;
  comment: string;
  setComment: (comment: string) => void;
  reminder: ReminderValue;
  setReminder: (reminder: ReminderValue) => void;
  minStart: Date;
  maxStart: Date;
};

export function ReservationFormFields({
  settings,
  startsAt,
  endsAt,
  setStartsAt,
  setEndsAt,
  comment,
  setComment,
  reminder,
  setReminder,
  minStart,
  maxStart,
}: ReservationFormFieldsProps) {
  const { t } = useTranslation();
  const commentId = useId();
  const targetsQuery = useNotificationsUserControllerGetUserTargets();
  const hasActiveDm = Boolean(
    targetsQuery.data?.some(
      (target) => target.targetType === "DM" && target.active && target.canSend,
    ),
  );

  const minEnd = startsAt
    ? new Date(
        startsAt.getTime() + settings.reservationMinDurationMinutes * 60_000,
      )
    : minStart;
  const maxEnd = startsAt
    ? new Date(
        startsAt.getTime() + settings.reservationMaxDurationMinutes * 60_000,
      )
    : maxStart;

  return (
    <>
      <div className="space-y-2">
        <Label>{t("reservations.schedule.dialog.startDate")}</Label>
        <DateTimePicker
          value={startsAt}
          onChange={setStartsAt}
          min={minStart}
          max={maxStart}
          minuteStep={settings.reservationTimeGranularityMinutes}
          placeholder={t("reservations.schedule.dialog.startDatePlaceholder")}
          timeLabel={t("reservations.datePicker.time")}
          clearLabel={t("reservations.datePicker.clear")}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>{t("reservations.schedule.dialog.endDate")}</Label>
        <DateTimePicker
          value={endsAt}
          onChange={setEndsAt}
          min={minEnd}
          max={maxEnd}
          minuteStep={settings.reservationTimeGranularityMinutes}
          placeholder={t("reservations.schedule.dialog.endDatePlaceholder")}
          timeLabel={t("reservations.datePicker.time")}
          clearLabel={t("reservations.datePicker.clear")}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={commentId}>
          {t("reservations.schedule.dialog.comment")}
        </Label>
        <Textarea
          id={commentId}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={128}
          rows={3}
          placeholder={t("reservations.schedule.dialog.commentPlaceholder")}
          className="resize-none"
        />
        <p className="text-right text-xs text-muted-foreground">
          {comment.length}/128
        </p>
      </div>
      <div className="space-y-2">
        <Label>{t("reservations.schedule.dialog.reminder")}</Label>
        <Select
          value={reminder}
          onValueChange={(value) => value && setReminder(value)}
          items={REMINDER_VALUES.map((value) => ({
            value,
            label: t(`reservations.reminders.${value}`),
          }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REMINDER_VALUES.map((value) => (
              <SelectItem
                key={value}
                value={value}
                disabled={value !== "none" && !hasActiveDm}
              >
                {t(`reservations.reminders.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!hasActiveDm && targetsQuery.isSuccess && (
          <p className="text-xs text-muted-foreground">
            {t("reservations.schedule.dialog.dmRequired")}{" "}
            <TextLink
              className="underline-offset-4"
              render={<Link to={ROUTES.user.notifications.base} />}
            >
              {t("reservations.schedule.dialog.configureDm")}
            </TextLink>
          </p>
        )}
      </div>
    </>
  );
}
