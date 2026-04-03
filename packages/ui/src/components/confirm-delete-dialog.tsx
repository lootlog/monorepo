"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@lootlog/ui/components/alert-dialog";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { Trash2 } from "lucide-react";
import { cloneElement, isValidElement, useState, type ReactNode } from "react";

interface ConfirmDeleteDialogProps {
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  trigger?: ReactNode;
  disabled?: boolean;
  confirmText?: string;
  confirmLabel?: string;
  confirmButtonLabel?: string;
  cancelButtonLabel?: string;
}

export function ConfirmDeleteDialog({
  onConfirm,
  title = "Czy na pewno chcesz usunąć?",
  description = "Tej operacji nie można cofnąć.",
  trigger,
  disabled,
  confirmText,
  confirmLabel,
  confirmButtonLabel = "Usuń",
  cancelButtonLabel = "Anuluj",
}: ConfirmDeleteDialogProps) {
  const [inputValue, setInputValue] = useState("");
  const requiresConfirmation = confirmText !== undefined;
  const isConfirmDisabled =
    Boolean(disabled) || (requiresConfirmation && inputValue !== confirmText);
  const resolvedTrigger =
    trigger && isValidElement<{ disabled?: boolean }>(trigger)
      ? cloneElement(trigger, { disabled })
      : trigger;

  return (
    <AlertDialog onOpenChange={() => setInputValue("")}>
      <AlertDialogTrigger asChild>
        {resolvedTrigger || (
          <Button variant="ghost" size="icon" disabled={disabled}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {requiresConfirmation && (
          <div className="flex flex-col gap-2 py-2">
            {confirmLabel && (
              <p className="text-sm text-muted-foreground">{confirmLabel}</p>
            )}
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={confirmText}
              autoComplete="off"
            />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelButtonLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void onConfirm();
            }}
            disabled={isConfirmDisabled}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {confirmButtonLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
