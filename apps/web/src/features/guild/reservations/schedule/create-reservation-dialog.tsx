import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@lootlog/ui/components/drawer";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Textarea } from "@lootlog/ui/components/textarea";
import { DatePicker } from "../date-picker";
import { toast } from "sonner";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { getApiErrorMessage } from "@/features/guild/events/utils/get-api-error-message";
import { useTranslation } from "react-i18next";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useQueryClient } from "@tanstack/react-query";
import {
  invalidateReservationsControllerGetReservations,
  useReservationsControllerCreateReservation,
} from "@lootlog/api-client/react-query/main/reservations";
import {
  getOptimisticReservationId,
  getReservationsCacheSnapshot,
  replaceReservationInReservationsCache,
  reservationsCacheQueryKey,
  restoreReservationsCacheSnapshot,
  upsertReservationInReservationsCache,
  type ReservationsCacheMutationContext,
} from "../reservations-api";
import {
  getReservationEarliestStartDate,
  getReservationLatestStartDate,
  type ReservationSettings,
  validateReservationDateRange,
} from "./reservation-settings";
import { getReservationValidationMessage } from "./reservation-validation-message";

type CreateReservationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservationKey: string;
  currentUserId?: string;
  settings: ReservationSettings;
};

const formatDateTimeLocalValue = (date: Date | undefined) => {
  if (!date) {
    return "";
  }

  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const parseDateTimeLocalValue = (value: string) => {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
};

const addMinutes = (date: Date, minutes: number) =>
  new Date(date.getTime() + minutes * 60 * 1000);

export const CreateReservationDialog: React.FC<
  CreateReservationDialogProps
> = ({ open, onOpenChange, reservationKey, currentUserId, settings }) => {
  return (
    <CreateReservationDialogContent
      key={`${reservationKey}:${open ? "open" : "closed"}`}
      open={open}
      onOpenChange={onOpenChange}
      reservationKey={reservationKey}
      currentUserId={currentUserId}
      settings={settings}
    />
  );
};

const CreateReservationDialogContent: React.FC<
  CreateReservationDialogProps
> = ({ open, onOpenChange, reservationKey, currentUserId, settings }) => {
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [isFromPickerOpen, setIsFromPickerOpen] = useState(false);
  const [isToPickerOpen, setIsToPickerOpen] = useState(false);
  const [comment, setComment] = useState("");
  const reservationStartMinDate = getReservationEarliestStartDate();
  const reservationStartMaxDate = getReservationLatestStartDate(settings);
  const reservationEndMinDate = fromDate
    ? addMinutes(fromDate, settings.reservationMinDurationMinutes)
    : reservationStartMinDate;
  const reservationEndMaxDate = fromDate
    ? addMinutes(fromDate, settings.reservationMaxDurationMinutes)
    : undefined;

  const createReservationMutation = useReservationsControllerCreateReservation<
    unknown,
    ReservationsCacheMutationContext
  >({
    mutation: {
      onMutate: async (variables) => {
        if (!guildId) {
          return {
            previousReservations: undefined,
          };
        }

        await queryClient.cancelQueries({
          queryKey: reservationsCacheQueryKey(guildId),
        });

        const previousReservations = getReservationsCacheSnapshot(
          queryClient,
          guildId,
        );
        const optimisticReservationId = getOptimisticReservationId();

        upsertReservationInReservationsCache(queryClient, guildId, {
          id: optimisticReservationId,
          reservationId: variables.data.reservationId,
          createdDate: variables.data.createdDate,
          fromDate: variables.data.fromDate,
          toDate: variables.data.toDate,
          createdBy: variables.data.createdBy,
          comment: variables.data.comment ?? null,
        });

        return {
          previousReservations,
          optimisticReservationId,
        };
      },
      onSuccess: async (reservation, _variables, mutationContext) => {
        if (!guildId) {
          return;
        }

        if (mutationContext?.optimisticReservationId) {
          replaceReservationInReservationsCache(
            queryClient,
            guildId,
            mutationContext.optimisticReservationId,
            reservation,
          );
        } else {
          upsertReservationInReservationsCache(
            queryClient,
            guildId,
            reservation,
          );
        }

        await invalidateReservationsControllerGetReservations(queryClient, {
          guildId,
        });
      },
      onError: (_error, _variables, mutationContext) => {
        if (!guildId) {
          return;
        }

        restoreReservationsCacheSnapshot(
          queryClient,
          guildId,
          mutationContext?.previousReservations,
        );
      },
    },
  });
  const createReservation = createReservationMutation.mutateAsync;
  const isCreating = createReservationMutation.isPending;

  const handleCreateReservation = async () => {
    const validationError = validateReservationDateRange({
      fromDate,
      toDate,
      settings,
    });

    if (validationError) {
      toast.error(
        getReservationValidationMessage(validationError, t, settings),
        { position: "bottom-right" },
      );
      return;
    }

    if (!fromDate || !toDate) {
      return;
    }

    if (!reservationKey) {
      toast.error(
        t("reservations.schedule.validation.reservationTypeMissing"),
        {
          position: "bottom-right",
        },
      );
      return;
    }

    if (!currentUserId) {
      toast.error(t("reservations.schedule.validation.userMissing"), {
        position: "bottom-right",
      });
      return;
    }

    if (!guildId) {
      toast.error(t("reservations.schedule.toasts.createError"), {
        position: "bottom-right",
      });
      return;
    }

    try {
      const normalizedComment = comment.trim();
      const createdDate = new Date().toISOString();
      await createReservation({
        pathParams: { guildId },
        data: {
          reservationId: reservationKey,
          createdDate,
          fromDate: fromDate.toISOString(),
          toDate: toDate.toISOString(),
          createdBy: currentUserId,
          comment: normalizedComment.length > 0 ? normalizedComment : undefined,
        },
      });
      toast.success(t("reservations.schedule.toasts.created"), {
        position: "bottom-right",
      });
      onOpenChange(false);
    } catch (error) {
      const fallbackMessage = t("reservations.schedule.toasts.createError");
      toast.error(getApiErrorMessage(error) ?? fallbackMessage, {
        position: "bottom-right",
      });
    }
  };

  const renderFormContent = () => (
    <div className="space-y-4 px-3 py-3">
      {isMobile ? (
        <>
          <div className="flex flex-col gap-1">
            <label
              className="text-xs font-semibold text-muted-foreground"
              htmlFor="reservation-start-date"
            >
              {t("reservations.schedule.dialog.startDate")}
            </label>
            <Input
              id="reservation-start-date"
              type="datetime-local"
              step={60}
              min={formatDateTimeLocalValue(reservationStartMinDate)}
              max={formatDateTimeLocalValue(reservationStartMaxDate)}
              value={formatDateTimeLocalValue(fromDate)}
              onChange={(event) =>
                setFromDate(parseDateTimeLocalValue(event.target.value))
              }
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              className="text-xs font-semibold text-muted-foreground"
              htmlFor="reservation-end-date"
            >
              {t("reservations.schedule.dialog.endDate")}
            </label>
            <Input
              id="reservation-end-date"
              type="datetime-local"
              step={60}
              min={formatDateTimeLocalValue(reservationEndMinDate)}
              max={
                reservationEndMaxDate
                  ? formatDateTimeLocalValue(reservationEndMaxDate)
                  : undefined
              }
              value={formatDateTimeLocalValue(toDate)}
              onChange={(event) =>
                setToDate(parseDateTimeLocalValue(event.target.value))
              }
            />
          </div>
        </>
      ) : (
        <>
          <DatePicker
            label={t("reservations.schedule.dialog.startDate")}
            placeholder={t("reservations.schedule.dialog.startDatePlaceholder")}
            date={fromDate}
            setDate={(date) => setFromDate(date)}
            open={isFromPickerOpen}
            setOpen={setIsFromPickerOpen}
            onClear={() => setFromDate(undefined)}
            minuteStep={1}
            minDate={reservationStartMinDate}
            maxDate={reservationStartMaxDate}
          />
          <DatePicker
            label={t("reservations.schedule.dialog.endDate")}
            placeholder={t("reservations.schedule.dialog.endDatePlaceholder")}
            date={toDate}
            setDate={(date) => setToDate(date)}
            open={isToPickerOpen}
            setOpen={setIsToPickerOpen}
            onClear={() => setToDate(undefined)}
            minuteStep={1}
            minDate={reservationEndMinDate}
            maxDate={reservationEndMaxDate}
          />
        </>
      )}
      <div className="space-y-2">
        <label
          className="text-xs font-semibold text-muted-foreground"
          htmlFor="reservation-comment"
        >
          {t("reservations.schedule.dialog.comment")}
        </label>
        <Textarea
          id="reservation-comment"
          maxLength={128}
          placeholder={t("reservations.schedule.dialog.commentPlaceholder")}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          className="min-h-[58px] max-h-[58px] resize-none"
          rows={2}
        />
        <p className="text-[10px] text-muted-foreground text-right">
          {comment.trim().length}/{128}
        </p>
      </div>
    </div>
  );

  const renderFooter = (fullWidth = false) => (
    <>
      <Button
        variant="outline"
        size="sm"
        className={fullWidth ? "flex-1" : undefined}
        onClick={() => onOpenChange(false)}
      >
        {t("common.cancel")}
      </Button>
      <Button
        type="button"
        size="sm"
        className={fullWidth ? "flex-1" : undefined}
        disabled={
          !fromDate ||
          !toDate ||
          !reservationKey ||
          !currentUserId ||
          isCreating
        }
        onClick={handleCreateReservation}
      >
        {t("common.save")}
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="flex h-[85vh] max-h-[85vh] flex-col overflow-hidden p-0">
          <DrawerHeader className="shrink-0 border-b px-4 py-3">
            <DrawerTitle>{t("reservations.schedule.dialog.title")}</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="min-h-0 flex-1">
            {renderFormContent()}
          </ScrollArea>
          <DrawerFooter className="shrink-0 flex-row border-t">
            {renderFooter(true)}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md translate-y-[-35%] sm:translate-y-[-100%]"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>{t("reservations.schedule.dialog.title")}</DialogTitle>
        </DialogHeader>
        {renderFormContent()}
        <DialogFooter className="mr-3 mb-2">{renderFooter()}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
