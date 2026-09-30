import { Popover as BasePopover } from "@base-ui/react/popover";
import { type ComponentProps, type ReactElement, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  preservePopoverOnMenuPress,
} from "@/components/ui/popover";

type PopoverContentProps = ComponentProps<typeof PopoverContent>;

type ConfirmPopoverProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Element that opens the confirmation; omit it and pass `anchor` instead. */
  trigger?: ReactElement;
  anchor?: PopoverContentProps["anchor"];
  side?: PopoverContentProps["side"];
  align?: PopoverContentProps["align"];
  finalFocus?: PopoverContentProps["finalFocus"];
  title: string;
  description?: string;
  confirmLabel: string;
  confirmVariant?: ComponentProps<typeof Button>["variant"];
  /** The confirmed action is running; the confirm button shows a spinner. */
  pending?: boolean;
  onConfirm: () => void;
};

/**
 * Asks before an action that removes or ends a record other members of the
 * Organization see. Focus lands on the cancel button, so an accidental Enter
 * or Space keeps the record, and Escape or an outside press cancels. Escape
 * closes only the confirmation, not a context menu it was opened from.
 */
export const ConfirmPopover = ({
  open,
  onOpenChange,
  trigger,
  anchor,
  side = "top",
  align = "start",
  finalFocus,
  title,
  description,
  confirmLabel,
  confirmVariant = "destructive",
  pending = false,
  onConfirm,
}: ConfirmPopoverProps) => {
  const { t } = useTranslation("common");
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Popover
      open={open}
      onOpenChange={preservePopoverOnMenuPress((nextOpen) =>
        onOpenChange(nextOpen),
      )}
    >
      {trigger ? <PopoverTrigger asChild>{trigger}</PopoverTrigger> : null}
      <PopoverContent
        anchor={anchor}
        side={side}
        align={align}
        role="alertdialog"
        className="ll:w-64"
        initialFocus={cancelRef}
        finalFocus={finalFocus}
        // Margonem handles every document key press whose target is not a
        // text field (Enter opens its chat, digits use skills), so keys
        // pressed while the confirmation holds focus stay inside it. That
        // also hides Escape from the popover's own document listener.
        onKeyDown={(event) => {
          event.stopPropagation();

          if (event.key === "Escape") {
            event.preventDefault();
            onOpenChange(false);
          }
        }}
        onKeyUp={(event) => event.stopPropagation()}
      >
        <div className="ll:flex ll:flex-col ll:gap-2">
          <div className="ll:flex ll:flex-col ll:gap-1">
            <BasePopover.Title className="ll:m-0 ll:text-xs ll:font-semibold ll:text-popover-foreground">
              {title}
            </BasePopover.Title>
            {description ? (
              <BasePopover.Description className="ll:m-0 ll:text-[11px] ll:text-muted-foreground">
                {description}
              </BasePopover.Description>
            ) : null}
          </div>
          <div className="ll:flex ll:justify-end ll:gap-2">
            <Button
              ref={cancelRef}
              size="xs"
              variant="menu"
              type="button"
              onClick={() => onOpenChange(false)}
            >
              {t("actions.cancel")}
            </Button>
            <Button
              size="xs"
              variant={confirmVariant}
              type="button"
              loading={pending}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
