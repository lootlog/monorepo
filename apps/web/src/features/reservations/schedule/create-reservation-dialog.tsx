import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { Button } from "@lootlog/ui/components/button";
import { Textarea } from "@lootlog/ui/components/textarea";
import { DatePicker } from "../date-picker";
import { toast } from "sonner";
import { useCreateReservation } from "@/hooks/api/reservations/use-create-reservation";

type CreateReservationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservationKey: string;
  currentUserId?: string;
};

export const CreateReservationDialog: React.FC<
  CreateReservationDialogProps
> = ({ open, onOpenChange, reservationKey, currentUserId }) => {
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [isFromPickerOpen, setIsFromPickerOpen] = useState(false);
  const [isToPickerOpen, setIsToPickerOpen] = useState(false);
  const [comment, setComment] = useState("");

  const { mutateAsync: createReservation, isPending: isCreating } =
    useCreateReservation();

  useEffect(() => {
    if (!open) {
      setComment("");
      setFromDate(undefined);
      setToDate(undefined);
      setIsFromPickerOpen(false);
      setIsToPickerOpen(false);
    }
  }, [open]);

  const handleCreateReservation = useCallback(async () => {
    if (!fromDate || !toDate) {
      toast.error("Wybierz zakres czasowy rezerwacji.", {
        position: "bottom-right",
      });
      return;
    }

    if (fromDate >= toDate) {
      toast.error("Data zakończenia musi być późniejsza niż rozpoczęcia.", {
        position: "bottom-right",
      });
      return;
    }

    if (!reservationKey) {
      toast.error("Nie udało się ustalić rodzaju rezerwacji.", {
        position: "bottom-right",
      });
      return;
    }

    if (!currentUserId) {
      toast.error("Brak informacji o użytkowniku.", {
        position: "bottom-right",
      });
      return;
    }

    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    if (fromDate.getTime() < oneHourAgo) {
      toast.error(
        "Godzina rozpoczęcia rezerwacji nie może być starsza niż 1 godzina od aktualnego czasu.",
        { position: "bottom-right" },
      );
      return;
    }

    const minimumDurationMs = 30 * 60 * 1000;
    if (toDate.getTime() - fromDate.getTime() < minimumDurationMs) {
      toast.error("Rezerwacja musi trwać co najmniej 30 minut.", {
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
      toast.success("Rezerwacja została utworzona.", {
        position: "bottom-right",
      });
      onOpenChange(false);
    } catch (error) {
      const fallbackMessage = "Nie udało się utworzyć rezerwacji.";
      if (error && typeof error === "object" && "response" in error) {
        const maybeAxiosError = error as {
          response?: {
            data?: { message?: string | string[] };
            status?: number;
          };
        };
        const rawMessage = maybeAxiosError.response?.data?.message;
        const normalizedMessage = Array.isArray(rawMessage)
          ? rawMessage[0]
          : rawMessage;
        const message =
          typeof normalizedMessage === "string" ? normalizedMessage : undefined;
        toast.error(message ?? fallbackMessage, {
          position: "bottom-right",
        });
      } else if (error instanceof Error) {
        const message = error.message || undefined;
        toast.error(message || fallbackMessage, {
          position: "bottom-right",
        });
      } else {
        toast.error(fallbackMessage, {
          position: "bottom-right",
        });
      }
    }
  }, [
    fromDate,
    toDate,
    reservationKey,
    currentUserId,
    createReservation,
    comment,
    onOpenChange,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md translate-y-[-35%] sm:translate-y-[-100%]"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>Dodaj rezerwację</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-3 ml-3 mr-3 mb-4">
          <DatePicker
            label="Data rozpoczęcia"
            placeholder="Wybierz początek rezerwacji"
            date={fromDate}
            setDate={(date) => setFromDate(date)}
            open={isFromPickerOpen}
            setOpen={setIsFromPickerOpen}
            onClear={() => setFromDate(undefined)}
          />
          <DatePicker
            label="Data zakończenia"
            placeholder="Wybierz koniec rezerwacji"
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
              Komentarz (opcjonalnie)
            </label>
            <Textarea
              id="reservation-comment"
              maxLength={128}
              placeholder="Dodaj krótki komentarz do rezerwacji"
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
        <DialogFooter className="mt-0 mb-2 mr-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Anuluj
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
            Zapisz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
