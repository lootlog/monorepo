import { Check, LoaderCircle, UserPlus, UserCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatBinding, useHotkeysStore } from "@/store/hotkeys.store";
import { CHAT_GATHERING_ACTION_CLASS } from "../chat.constants";

export function ChatGatheringJoinButton({
  pending,
  disabled,
  featured = false,
  status,
  label: customLabel,
  onClick,
}: {
  pending: boolean;
  disabled: boolean;
  featured?: boolean;
  status?: "applied" | "inParty";
  label?: string;
  onClick: () => void;
}) {
  const { t } = useTranslation("chat");
  const binding = useHotkeysStore(
    (state) => state.bindings["join-party-gathering"],
  );
  const actionLabel = t(status ? "gatherings.withdraw" : "gatherings.apply");
  const pendingLabel = t(
    status ? "gatherings.withdrawing" : "gatherings.applying",
  );
  const label = customLabel ?? (pending ? pendingLabel : actionLabel);
  const statusLabel = status ? t(`gatherings.${status}`) : undefined;
  const StatusIcon = status === "inParty" ? UserCheck : Check;
  const buttonDisabled = pending || disabled;
  const shortcut =
    binding.type === "keyboard" && !binding.key
      ? t("gatherings.shortcutUnset")
      : formatBinding(binding);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="ll:inline-flex ll:shrink-0 ll:rounded-sm ll:focus-visible:outline-2 ll:focus-visible:outline-ring ll:focus-visible:-outline-offset-2"
          tabIndex={buttonDisabled ? 0 : undefined}
          aria-label={buttonDisabled ? label : undefined}
        >
          <Button
            type="button"
            variant="ghost"
            className={`${CHAT_GATHERING_ACTION_CLASS} ll:w-6 ${status ? "ll:bg-emerald-500/20 ll:text-emerald-300" : ""}`}
            aria-label={label}
            aria-description={statusLabel}
            aria-busy={pending}
            disabled={buttonDisabled}
            onClick={onClick}
          >
            {pending ? (
              <LoaderCircle
                size={14}
                aria-hidden="true"
                className="ll:animate-spin ll:motion-reduce:animate-none"
              />
            ) : status ? (
              <StatusIcon size={14} aria-hidden="true" />
            ) : (
              <UserPlus size={14} aria-hidden="true" />
            )}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">
        {customLabel ??
          (statusLabel
            ? `${statusLabel} · ${label}`
            : featured
              ? `${label} (${shortcut})`
              : label)}
      </TooltipContent>
    </Tooltip>
  );
}
