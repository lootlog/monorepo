import { invalidateReservationQueries } from "./invalidate-reservation-queries";
import {
  ReservationFormFields,
  toReminderOffset,
  type ReminderValue,
} from "@/features/guild/reservations/schedule/reservation-form-fields";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { ReservationSettings } from "@lootlog/domain/reservations";
import { toast } from "sonner";
import { useCreateReservation } from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import { getReservationErrorMessage } from "../get-reservation-error-message";
import {
  getReservationEarliestStartDate,
  getReservationLatestStartDate,
  validateReservationDateRange,
} from "./reservation-settings";
import { getReservationValidationMessage } from "./reservation-validation-message";

type ReservationFormProps = {
  guildId: string;
  spotId: string;
  settings: ReservationSettings;
  initialStartsAt?: Date;
  initialEndsAt?: Date;
  onCancel: () => void;
  onSuccess: () => void;
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

  useEffect(() => {
    setStartsAt(initialStartsAt);
    setEndsAt(initialEndsAt);
  }, [initialEndsAt, initialStartsAt]);

  const createMutation = useCreateReservation({
    mutation: {
      onSuccess: async () => {
        await invalidateReservationQueries(queryClient, guildId, spotId);
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
        reminderMinutesBefore: toReminderOffset(reminder) ?? undefined,
      },
    });
  };

  const minStart = getReservationEarliestStartDate();
  const maxStart = getReservationLatestStartDate(settings);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <ReservationFormFields
        settings={settings}
        startsAt={startsAt}
        endsAt={endsAt}
        setStartsAt={setStartsAt}
        setEndsAt={setEndsAt}
        comment={comment}
        setComment={setComment}
        reminder={reminder}
        setReminder={setReminder}
        minStart={minStart}
        maxStart={maxStart}
      />
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
