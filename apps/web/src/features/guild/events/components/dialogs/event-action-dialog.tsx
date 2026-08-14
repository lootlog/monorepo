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
import { Spinner } from "@lootlog/ui/components/spinner";

interface EventActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventName: string;
  onConfirm: () => Promise<void>;
  isPending: boolean;
  titleKey: string;
  descriptionKey: string;
  actionLabelKey: string;
  variant?: "destructive" | "default";
  requireNameConfirmation?: boolean;
  closeOnConfirm?: boolean;
}

export const EventActionDialog = (props: EventActionDialogProps) => {
  if (props.requireNameConfirmation) {
    return (
      <EventActionDialogWithConfirmation
        key={`${props.eventName}:${props.open ? "open" : "closed"}`}
        {...props}
      />
    );
  }

  return <EventActionDialogSimple {...props} />;
};

const EventActionDialogSimple = ({
  open,
  onOpenChange,
  eventName,
  onConfirm,
  isPending,
  titleKey,
  descriptionKey,
  actionLabelKey,
  variant = "default",
  closeOnConfirm = true,
}: EventActionDialogProps) => {
  const { t } = useTranslation();

  const handleConfirm = async () => {
    await onConfirm();
    if (closeOnConfirm) {
      onOpenChange(false);
    }
  };

  const isDestructive = variant === "destructive";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t(titleKey)}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(descriptionKey, { name: eventName })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventBaseUIHandler();
              void handleConfirm();
            }}
            disabled={isPending}
            className={
              isDestructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
          >
            {isPending && <Spinner className="w-4 h-4 mr-2" />}
            {t(actionLabelKey)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const EventActionDialogWithConfirmation = ({
  open,
  onOpenChange,
  eventName,
  onConfirm,
  isPending,
  titleKey,
  descriptionKey,
  actionLabelKey,
  variant = "default",
}: EventActionDialogProps) => {
  const { t } = useTranslation();
  const [confirmationValue, setConfirmationValue] = useState("");
  const inputId = useId();

  const isConfirmationValid = confirmationValue.trim() === eventName.trim();
  const isDestructive = variant === "destructive";

  const handleConfirm = async () => {
    if (!isConfirmationValid) return;
    await onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t(titleKey)}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(descriptionKey, { name: eventName })}
          </AlertDialogDescription>
        </AlertDialogHeader>

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

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending || !isConfirmationValid}
            className={
              isDestructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
            onClick={(e) => {
              e.preventBaseUIHandler();
              void handleConfirm();
            }}
          >
            {isPending && <Spinner className="w-4 h-4 mr-2" />}
            {t(actionLabelKey)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
