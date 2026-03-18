import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@lootlog/ui/components/alert-dialog";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { Loader2 } from "lucide-react";

interface DeleteEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventName: string;
  onConfirm: () => Promise<void>;
  isPending: boolean;
  requireEventNameConfirmation?: boolean;
}

export const DeleteEventDialog = ({
  open,
  onOpenChange,
  eventName,
  onConfirm,
  isPending,
  requireEventNameConfirmation = false,
}: DeleteEventDialogProps) => {
  return (
    <DeleteEventDialogContent
      key={`${eventName}:${open ? "open" : "closed"}`}
      open={open}
      onOpenChange={onOpenChange}
      eventName={eventName}
      onConfirm={onConfirm}
      isPending={isPending}
      requireEventNameConfirmation={requireEventNameConfirmation}
    />
  );
};

const DeleteEventDialogContent = ({
  open,
  onOpenChange,
  eventName,
  onConfirm,
  isPending,
  requireEventNameConfirmation,
}: DeleteEventDialogProps) => {
  const { t } = useTranslation();
  const [confirmationValue, setConfirmationValue] = useState("");
  const inputId = useId();

  const isConfirmationValid =
    !requireEventNameConfirmation ||
    confirmationValue.trim() === eventName.trim();

  const handleConfirm = async () => {
    if (!isConfirmationValid) return;
    await onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("events.deleteDialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("events.deleteDialog.description", { name: eventName })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {requireEventNameConfirmation && (
          <div className="space-y-2">
            <Label htmlFor={inputId}>
              {t(
                "events.deleteDialog.confirmLabel",
                "Wpisz nazwę eventu, aby potwierdzić",
              )}
            </Label>
            <Input
              id={inputId}
              value={confirmationValue}
              onChange={(e) => setConfirmationValue(e.target.value)}
              placeholder={t(
                "events.deleteDialog.confirmPlaceholder",
                "Nazwa eventu",
              )}
              autoComplete="off"
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              {t(
                "events.deleteDialog.confirmHint",
                "Aby usunąć event, wpisz dokładnie: {{name}}",
                { name: eventName },
              )}
            </p>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending || !isConfirmationValid}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t("events.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
