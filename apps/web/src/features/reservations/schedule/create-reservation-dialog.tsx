import { useState, useCallback } from "react";
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
import { Textarea } from "@lootlog/ui/components/textarea";
import { DatePicker } from "../date-picker";
import { toast } from "sonner";
import { useCreateReservation } from "@/hooks/api/reservations/use-create-reservation";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { getApiErrorMessage } from "@/features/events/utils/get-api-error-message";
import { useTranslation } from "react-i18next";

type CreateReservationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservationKey: string;
  currentUserId?: string;
};

export const CreateReservationDialog: React.FC<
  CreateReservationDialogProps
> = ({ open, onOpenChange, reservationKey, currentUserId }) => {
  return (
    <CreateReservationDialogContent
      key={`${reservationKey}:${open ? "open" : "closed"}`}
      open={open}
      onOpenChange={onOpenChange}
      reservationKey={reservationKey}
      currentUserId={currentUserId}
    />
  );
};

const CreateReservationDialogContent: React.FC<
  CreateReservationDialogProps
> = ({ open, onOpenChange, reservationKey, currentUserId }) => {
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [isFromPickerOpen, setIsFromPickerOpen] = useState(false);
  const [isToPickerOpen, setIsToPickerOpen] = useState(false);
  const [comment, setComment] = useState("");

  const { mutateAsync: createReservation, isPending: isCreating } =
    useCreateReservation();

  const handleCreateReservation = useCallback(async () => {
    if (!fromDate || !toDate) {
      toast.error(t("reservations.schedule.validation.timeRangeRequired"), {
        position: "bottom-right",
      });
      return;
    }

    if (fromDate >= toDate) {
      toast.error(t("reservations.schedule.validation.endAfterStart"), {
        position: "bottom-right",
      });
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

    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    if (fromDate.getTime() < oneHourAgo) {
      toast.error(t("reservations.schedule.validation.startTooOld"), {
        position: "bottom-right",
      });
      return;
    }

    const minimumDurationMs = 30 * 60 * 1000;
    if (toDate.getTime() - fromDate.getTime() < minimumDurationMs) {
      toast.error(t("reservations.schedule.validation.minimumDuration"), {
        position: "bottom-right",
      });
      return;
    }

    try {
      const normalizedComment = comment.trim();
      await createReservation({
        reservationId: reservationKey,
        createdDate: new Date(),
        fromDate,
        toDate,
        createdBy: currentUserId,
        comment: normalizedComment.length > 0 ? normalizedComment : undefined,
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
  }, [
    fromDate,
    toDate,
    reservationKey,
    currentUserId,
    createReservation,
    comment,
    onOpenChange,
    t,
  ]);

  const renderFormContent = () => (
    <div className="space-y-4 px-3 mb-4 mt-3">
      <DatePicker
        label={t("reservations.schedule.dialog.startDate")}
        placeholder={t("reservations.schedule.dialog.startDatePlaceholder")}
        date={fromDate}
        setDate={(date) => setFromDate(date)}
        open={isFromPickerOpen}
        setOpen={setIsFromPickerOpen}
        onClear={() => setFromDate(undefined)}
      />
      <DatePicker
        label={t("reservations.schedule.dialog.endDate")}
        placeholder={t("reservations.schedule.dialog.endDatePlaceholder")}
        date={toDate}
        setDate={(date) => setToDate(date)}
        open={isToPickerOpen}
        setOpen={setIsToPickerOpen}
        onClear={() => setToDate(undefined)}
      />
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

  const renderFooter = () => (
    <>
      <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
        {t("common.cancel")}
      </Button>
      <Button
        type="button"
        size="sm"
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
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t("reservations.schedule.dialog.title")}</DrawerTitle>
          </DrawerHeader>
          {renderFormContent()}
          <DrawerFooter>{renderFooter()}</DrawerFooter>
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
