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
} from "@lootlog/ui/components/alert-dialog";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import {
  cloneElement,
  isValidElement,
  useId,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";

type ConfirmDialogBaseProps = {
  onConfirm: () => void | Promise<void>;
  title: ReactNode;
  description: ReactNode;
  confirmButtonLabel: string;
  cancelButtonLabel: string;
  variant?: "destructive" | "default";
  disabled?: boolean;
  pending?: boolean;
  confirmText?: string;
  confirmLabel?: string;
  finalFocus?: ComponentProps<typeof AlertDialogContent>["finalFocus"];
};

type ConfirmDialogTriggerProps = {
  trigger: ReactElement;
  triggerTooltip?: ReactNode;
  triggerTooltipSide?: "top" | "right" | "bottom" | "left";
  open?: never;
  onOpenChange?: (open: boolean) => void;
};

type ConfirmDialogControlledProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: never;
  triggerTooltip?: never;
  triggerTooltipSide?: never;
};

type ConfirmDialogProps = ConfirmDialogBaseProps &
  (ConfirmDialogTriggerProps | ConfirmDialogControlledProps);

export function ConfirmDialog({
  onConfirm,
  title,
  description,
  confirmButtonLabel,
  cancelButtonLabel,
  variant = "destructive",
  disabled,
  pending = false,
  confirmText,
  confirmLabel,
  finalFocus,
  trigger,
  triggerTooltip,
  triggerTooltipSide = "top",
  open,
  onOpenChange,
}: ConfirmDialogProps) {
  const inputId = useId();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = open ?? uncontrolledOpen;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const isBusy = pending || isSubmitting;

  const isConfirmDisabled =
    Boolean(disabled) ||
    isBusy ||
    (confirmText !== undefined && inputValue.trim() !== confirmText.trim());

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);

    if (!nextOpen) {
      setInputValue("");
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (isConfirmDisabled) return;

    setIsSubmitting(true);

    try {
      await onConfirm();
      handleOpenChange(false);
    } catch {
      setIsSubmitting(false);
    }
  };

  const triggerElement = isValidElement<{
    disabled?: boolean;
    onClick?: (event: MouseEvent<HTMLElement>) => void;
  }>(trigger)
    ? cloneElement(trigger, {
        disabled,
        onClick: (event: MouseEvent<HTMLElement>) => {
          trigger.props.onClick?.(event);

          if (!event.defaultPrevented && !disabled) handleOpenChange(true);
        },
      })
    : null;

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!isBusy) handleOpenChange(nextOpen);
      }}
    >
      {triggerElement && triggerTooltip ? (
        <Tooltip>
          <TooltipTrigger
            render={<span className="inline-flex">{triggerElement}</span>}
          />
          <TooltipContent side={triggerTooltipSide}>
            {triggerTooltip}
          </TooltipContent>
        </Tooltip>
      ) : (
        triggerElement
      )}
      <AlertDialogContent
        finalFocus={finalFocus}
        onClick={(event) => event.stopPropagation()}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {confirmText !== undefined && (
          <div className="flex flex-col gap-2">
            <Label
              htmlFor={inputId}
              className="font-normal text-muted-foreground"
            >
              {confirmLabel}
            </Label>
            <Input
              id={inputId}
              disabled={isBusy}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder={confirmText}
              autoComplete="off"
            />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isBusy}>
            {cancelButtonLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            render={<Button variant={variant} loading={isBusy} />}
            onClick={(event) => {
              event.preventBaseUIHandler();
              void handleConfirm();
            }}
            disabled={isConfirmDisabled}
          >
            {confirmButtonLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
