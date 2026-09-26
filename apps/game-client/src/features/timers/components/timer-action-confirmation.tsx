import { RotateCcw, Trash2 } from "lucide-react";
import { useRef, useState, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmPopover } from "@/components/confirm-popover";
import { ContextMenuItem } from "@/components/ui/context-menu";

type TimerActionConfirmationProps = {
  action: "reset" | "delete";
  timerName: string;
  scopeLabel: string;
  pending: boolean;
  onConfirm: () => Promise<boolean>;
  onConfirmed?: () => void;
  onOpen?: () => void;
  trigger?: ReactElement;
};

export const TimerActionConfirmation = ({
  action,
  timerName,
  scopeLabel,
  pending,
  onConfirm,
  onConfirmed,
  onOpen,
  trigger,
}: TimerActionConfirmationProps) => {
  const { t } = useTranslation("timers");
  const [open, setOpen] = useState(false);
  const confirming = useRef(false);
  const isDelete = action === "delete";
  const Icon = isDelete ? Trash2 : RotateCcw;
  const confirmationKey = isDelete ? "deleteConfirm" : "resetConfirm";

  return (
    <ConfirmPopover
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen && !open) onOpen?.();
        setOpen(nextOpen);
      }}
      side="right"
      title={t(`contextMenu.${confirmationKey}.title`, { name: timerName })}
      description={t(`contextMenu.${confirmationKey}.description`, {
        guilds: scopeLabel,
      })}
      confirmLabel={t(`contextMenu.${confirmationKey}.confirm`)}
      confirmVariant={isDelete ? "destructive" : "default"}
      pending={pending}
      onConfirm={() => {
        if (confirming.current || pending) return;
        confirming.current = true;

        void onConfirm()
          .then((succeeded) => {
            if (succeeded) {
              setOpen(false);
              onConfirmed?.();
            }
          })
          .finally(() => {
            confirming.current = false;
          });
      }}
      trigger={
        trigger ?? (
          <ContextMenuItem
            disabled={pending}
            className={
              isDelete
                ? "ll:text-red-300 ll:hover:bg-red-500/20 ll:data-[highlighted]:bg-red-500/20 ll:focus-visible:bg-red-500/20"
                : "ll:text-emerald-300"
            }
            onSelect={(event) => event.preventDefault()}
          >
            <Icon className="ll:h-4 ll:w-4 ll:mr-2" />
            {t(isDelete ? "contextMenu.delete" : "contextMenu.restart")}
          </ContextMenuItem>
        )
      }
    />
  );
};
