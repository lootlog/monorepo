import { useState } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { toast } from "sonner";
import { Spinner } from "@lootlog/ui/components/spinner";
import { motion } from "framer-motion";

import { useCreateReservation } from "@/hooks/api/reservations/use-create-reservation";
import { Button } from "@lootlog/ui/components/button";
import { Textarea } from "@lootlog/ui/components/textarea";

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

      toast.success("Rezerwacja została utworzona.");
      onSuccess();
    } catch (error) {
      const fallbackMessage = "Nie udało się utworzyć rezerwacji.";
      if (error && typeof error === "object" && "response" in error) {
        const maybeAxiosError = error as {
          response?: { data?: { message?: string | string[] } };
        };
        const rawMessage = maybeAxiosError.response?.data?.message;
        const message = Array.isArray(rawMessage) ? rawMessage[0] : rawMessage;
        toast.error(typeof message === "string" ? message : fallbackMessage);
      } else {
        toast.error(fallbackMessage);
      }
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
        <h4 className="font-semibold text-sm">Nowa rezerwacja</h4>
        <p className="text-xs text-muted-foreground">
          {format(start, "EEE, d MMM HH:mm", { locale: pl })} -{" "}
          {format(end, "HH:mm", { locale: pl })}
        </p>
      </div>

      <div className="space-y-2">
        <Textarea
          placeholder="Komentarz (opcjonalnie)"
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
          Anuluj
        </Button>
        <Button size="sm" onClick={handleCreate} disabled={isCreating}>
          {isCreating && <Spinner className="mr-2 h-3 w-3" />}
          Zapisz
        </Button>
      </div>
    </motion.div>
  );
};
