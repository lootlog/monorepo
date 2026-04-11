import { useState } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { toast } from "sonner";
import { Spinner } from "@lootlog/ui/components/spinner";
import { motion } from "framer-motion";

import { useCreateReservation } from "@/hooks/api/reservations/use-create-reservation";
import { Button } from "@lootlog/ui/components/button";
import { Textarea } from "@lootlog/ui/components/textarea";
import { getApiErrorMessage } from "@/features/events/utils/get-api-error-message";
import { useTranslation } from "react-i18next";

type ReservationQuickAddPopoverProps = {
  start: Date;
  end: Date;
  reservationKey: string;
  currentUserId?: string;
  onClose: () => void;
  onSuccess: () => void;
};

export const ReservationQuickAddPopover: React.FC<
  ReservationQuickAddPopoverProps
> = ({ start, end, reservationKey, currentUserId, onClose, onSuccess }) => {
  const [comment, setComment] = useState("");
  const { t } = useTranslation();
  const { mutateAsync: createReservation, isPending: isCreating } =
    useCreateReservation();

  const handleCreate = async () => {
    if (!currentUserId || !reservationKey) return;

    try {
      const normalizedComment = comment.trim();
      await createReservation({
        reservationId: reservationKey,
        createdDate: new Date(),
        fromDate: start,
        toDate: end,
        createdBy: currentUserId,
        comment: normalizedComment.length > 0 ? normalizedComment : undefined,
      });

      toast.success(t("reservations.schedule.toasts.created"));
      onSuccess();
    } catch (error) {
      const fallbackMessage = t("reservations.schedule.toasts.createError");
      toast.error(getApiErrorMessage(error) ?? fallbackMessage);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.2 }}
      className="bg-popover text-popover-foreground border border-border shadow-2xl rounded-md p-4 w-[300px] flex flex-col gap-3"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col gap-1">
        <h4 className="font-semibold text-sm">
          {t("reservations.schedule.quickAdd.title")}
        </h4>
        <p className="text-xs text-muted-foreground">
          {format(start, "EEE, d MMM HH:mm", { locale: pl })} -{" "}
          {format(end, "HH:mm", { locale: pl })}
        </p>
      </div>

      <div className="space-y-2">
        <Textarea
          placeholder={t("reservations.schedule.quickAdd.commentPlaceholder")}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleCreate();
            }
          }}
          className="resize-none h-20 text-sm"
          maxLength={128}
          autoFocus
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button size="sm" onClick={handleCreate} disabled={isCreating}>
          {isCreating && <Spinner className="mr-2 h-3 w-3" />}
          {t("common.save")}
        </Button>
      </div>
    </motion.div>
  );
};
