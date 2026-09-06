import {
  ReservationFormFields,
  toReminderOffset,
  type ReminderValue,
  type ReminderOffset,
} from "@/features/guild/reservations/schedule/reservation-form-fields";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { resolveReservationSettings } from "@lootlog/domain/reservations";
import { toast } from "sonner";
import type { MyReservationsResponseDtoItemsItem } from "@lootlog/client/main";
import {
  getListMyReservationsQueryKey,
  useUpdateMyReservation,
} from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import { getReservationErrorMessage } from "@/features/guild/reservations/get-reservation-error-message";
import {
  getReservationEarliestStartDate,
  getReservationLatestStartDate,
  validateReservationDateRange,
} from "@/features/guild/reservations/schedule/reservation-settings";
import { getReservationValidationMessage } from "@/features/guild/reservations/schedule/reservation-validation-message";

type EditMyReservationFormProps = {
  reservation: MyReservationsResponseDtoItemsItem;
  onCancel: () => void;
  onSuccess: () => void;
};

const toReminderValue = (value: ReminderOffset | null): ReminderValue =>
  value === null ? "none" : (String(value) as ReminderValue);

export function EditMyReservationForm({
  reservation,
  onCancel,
  onSuccess,
}: EditMyReservationFormProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const initialStartsAt = new Date(reservation.startsAt);
  const [startsAt, setStartsAt] = useState<Date | undefined>(initialStartsAt);
  const [endsAt, setEndsAt] = useState<Date | undefined>(
    new Date(reservation.endsAt),
  );
  const [comment, setComment] = useState(reservation.comment ?? "");
  const [reminder, setReminder] = useState<ReminderValue>(
    toReminderValue(reservation.reminderMinutesBefore),
  );
  const settings = resolveReservationSettings(reservation.editingConstraints);

  const updateMutation = useUpdateMyReservation({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getListMyReservationsQueryKey(),
        });
        toast.success(t("reservations.schedule.toasts.updated"));
        onSuccess();
      },
      onError: (error) => {
        toast.error(getReservationErrorMessage(error, t));
      },
    },
  });

  const submit = () => {
    const keepsOriginalStart =
      startsAt?.getTime() === initialStartsAt.getTime();
    const validationError = validateReservationDateRange({
      fromDate: startsAt,
      toDate: endsAt,
      settings,
      allowPastStart: keepsOriginalStart,
    });
    if (validationError) {
      toast.error(
        getReservationValidationMessage(validationError, t, settings),
      );
      return;
    }
    if (!startsAt || !endsAt) return;

    updateMutation.mutate({
      pathParams: { reservationId: reservation.id },
      data: {
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        comment: comment.trim() || null,
        reminderMinutesBefore: toReminderOffset(reminder),
      },
    });
  };

  const earliestAllowedStart = getReservationEarliestStartDate();
  const minStart =
    initialStartsAt < earliestAllowedStart
      ? initialStartsAt
      : earliestAllowedStart;
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
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button
          type="submit"
          disabled={!startsAt || !endsAt}
          loading={updateMutation.isPending}
        >
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
