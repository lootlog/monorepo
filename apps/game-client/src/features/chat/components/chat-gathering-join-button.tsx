import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatBinding, useHotkeysStore } from "@/store/hotkeys.store";

const getTooltipLabel = (
  label: string,
  statusLabel: string | undefined,
  shortcut: string,
  featured: boolean,
) => {
  if (statusLabel) return `${statusLabel} · ${label}`;

  return featured ? `${label} (${shortcut})` : label;
};

export function ChatGatheringJoinButton({
  pending,
  disabled,
  featured = false,
  status,
  onClick,
}: {
  pending: boolean;
  disabled: boolean;
  featured?: boolean;
  status?: "applied" | "inParty";
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

  const label = pending ? pendingLabel : actionLabel;
  const statusLabel = status ? t(`gatherings.${status}`) : undefined;
  const buttonDisabled = pending || disabled;

  const shortcut =
    binding.type === "keyboard" && !binding.key
      ? t("gatherings.shortcutUnset")
      : formatBinding(binding);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="ll:inline-flex ll:shrink-0 ll:rounded-sm ll:focus-visible:outline-2 ll:focus-visible:outline-ring ll:focus-visible:-outline-offset-2 ll:absolute ll:inset-0 ll:z-1"
          tabIndex={buttonDisabled ? 0 : undefined}
          aria-label={buttonDisabled ? label : undefined}
        >
          <Button
            type="button"
            variant="ghost"
            className="ll:size-full ll:rounded ll:border-0 ll:bg-transparent ll:hover:bg-transparent ll:focus-visible:outline-2 ll:focus-visible:outline-ring"
            aria-label={label}
            aria-description={statusLabel}
            aria-busy={pending}
            disabled={buttonDisabled}
            onClick={onClick}
          />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">
        {getTooltipLabel(label, statusLabel, shortcut, featured)}
      </TooltipContent>
    </Tooltip>
  );
}
