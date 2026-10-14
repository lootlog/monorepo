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
import { Button } from "@lootlog/ui/components/button";
import { useState } from "react";
import { useTranslation } from "react-i18next";

type NotificationConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  /** Rejects to keep the dialog open, as after a failed request. */
  onConfirm: () => Promise<void>;
};

/** Confirms a destructive action chosen from a menu, which cannot host its own dialog trigger. */
export const NotificationConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: NotificationConfirmDialogProps) => {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const confirm = async () => {
    setIsSubmitting(true);

    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // The request reported its own error; the dialog stays for a retry.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSubmitting) onOpenChange(nextOpen);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>
            {t("settings.notifications.actions.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            render={<Button variant="destructive" loading={isSubmitting} />}
            disabled={isSubmitting}
            onClick={(event) => {
              event.preventBaseUIHandler();
              void confirm();
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
