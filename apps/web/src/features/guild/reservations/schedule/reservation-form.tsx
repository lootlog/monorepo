import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { ReservationSettings } from "@lootlog/domain/reservations";
import { toast } from "sonner";
import {
  getListReservationSpotsQueryKey,
  getListSpotReservationsQueryKey,
  useCreateReservation,
} from "@lootlog/client/main";
import { useNotificationsUserControllerGetUserTargets } from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
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
import { getReservationErrorMessage } from "../get-reservation-error-message";
import {
  getReservationEarliestStartDate,
  getReservationLatestStartDate,
  validateReservationDateRange,
} from "./reservation-settings";
import { getReservationValidationMessage } from "./reservation-validation-message";

type ReminderValue = "none" | "0" | "5" | "15" | "30";
type ReminderOffset = 0 | 5 | 15 | 30;

type ReservationFormProps = {
  guildId: string;
  spotId: string;
  settings: ReservationSettings;
  initialStartsAt?: Date;
  initialEndsAt?: Date;
  onCancel: () => void;
  onSuccess: () => void;
};

const REMINDER_VALUES: ReminderValue[] = ["none", "0", "5", "15", "30"];

const toReminderOffset = (value: ReminderValue): ReminderOffset | undefined => {
  if (value === "none") return undefined;
  return Number(value) as ReminderOffset;
};

export function ReservationForm({
  guildId,
  spotId,
  settings,
  initialStartsAt,
  initialEndsAt,
  onCancel,
  onSuccess,
}: ReservationFormProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [startsAt, setStartsAt] = useState<Date | undefined>(initialStartsAt);
  const [endsAt, setEndsAt] = useState<Date | undefined>(initialEndsAt);
  const [comment, setComment] = useState("");
  const [reminder, setReminder] = useState<ReminderValue>("none");
  const targetsQuery = useNotificationsUserControllerGetUserTargets();
  const hasActiveDm = Boolean(
    targetsQuery.data?.some(
      (target) => target.targetType === "DM" && target.active && target.canSend,
    ),
  );

  useEffect(() => {
    setStartsAt(initialStartsAt);
    setEndsAt(initialEndsAt);
  }, [initialEndsAt, initialStartsAt]);

  const createMutation = useCreateReservation({
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: getListReservationSpotsQueryKey({ guildId }),
          }),
          queryClient.invalidateQueries({
            queryKey: getListSpotReservationsQueryKey({ guildId, spotId }),
          }),
        ]);
        toast.success(t("reservations.schedule.toasts.created"));
        onSuccess();
      },
      onError: (error) => {
        toast.error(getReservationErrorMessage(error, t));
      },
    },
  });

  const submit = () => {
    const validationError = validateReservationDateRange({
      fromDate: startsAt,
      toDate: endsAt,
      settings,
    });
    if (validationError) {
      toast.error(
        getReservationValidationMessage(validationError, t, settings),
      );
      return;
    }
    if (!startsAt || !endsAt) return;

    const normalizedComment = comment.trim();
    createMutation.mutate({
      pathParams: { guildId, spotId },
      data: {
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        comment: normalizedComment || undefined,
        reminderMinutesBefore: toReminderOffset(reminder),
      },
    });
  };

  const minStart = getReservationEarliestStartDate();
  const maxStart = getReservationLatestStartDate(settings);
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
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
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
        <Label htmlFor="reservation-comment">
          {t("reservations.schedule.dialog.comment")}
        </Label>
        <Textarea
          id="reservation-comment"
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
            <Link
              to={ROUTES.user.notifications.base}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("reservations.schedule.dialog.configureDm")}
            </Link>
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button
          type="submit"
          disabled={!startsAt || !endsAt || createMutation.isPending}
        >
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
