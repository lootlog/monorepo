import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { usePartyCommand } from "@/features/command/hooks/use-party-command";
import { MapPin, Plus, Siren, Swords } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useChatQuickActions } from "@/features/chat/hooks/use-chat-quick-actions";
import { formatBinding, useHotkeysStore } from "@/store/hotkeys.store";

export const ChatQuickActionStrip = ({ guildId }: { guildId?: string }) => {
  const { t } = useTranslation("chat");
  const { sendHelp, sendPosition, isPending } = useChatQuickActions();
  const bindings = useHotkeysStore((state) => state.bindings);
  const { handlePartyCommand } = usePartyCommand();
  const [creatingParty, setCreatingParty] = useState(false);
  const [open, setOpen] = useState(false);
  const disabled = !guildId || isPending;

  const actions = [
    {
      key: "chat-position",
      label: t("quickActions.position"),
      icon: MapPin,
      run: () => sendPosition(guildId),
      disabled,
      shortcut: formatBinding(bindings["chat-position"]),
    },
    {
      key: "chat-help",
      label: t("quickActions.help"),
      icon: Siren,
      run: () => sendHelp(guildId),
      disabled,
      shortcut: formatBinding(bindings["chat-help"]),
    },
    {
      key: "party-finder",
      label: t("gatherings.title"),
      icon: Swords,
      run: async () => {
        if (!guildId) return;
        setCreatingParty(true);

        try {
          await handlePartyCommand(undefined, [guildId]);
        } finally {
          setCreatingParty(false);
        }
      },
      disabled: creatingParty || !guildId,
      shortcut: "",
    },
  ] as const;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="ll:size-6 ll:shrink-0 ll:p-0 ll:mr-2 ll:border-0"
              aria-label={t("quickActions.menu")}
            >
              <Plus aria-hidden className="ll:size-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">{t("quickActions.menu")}</TooltipContent>
      </Tooltip>
      <PopoverContent
        side="top"
        align="end"
        className="ll-action-menu ll:flex ll:flex-col ll:gap-0 ll:p-0 ll:overflow-hidden"
        aria-label={t("quickActions.menu")}
      >
        {actions.map(
          ({
            key,
            label,
            icon: Icon,
            run,
            disabled: actionDisabled,
            shortcut,
          }) => (
            <Button
              key={key}
              aria-label={label}
              type="button"
              variant="menu"
              className="ll:flex ll:w-full ll:justify-start ll:gap-2 ll:px-2"
              disabled={actionDisabled}
              onClick={() => {
                setOpen(false);
                void run();
              }}
            >
              <Icon aria-hidden className="ll:size-3.5" />
              {label}
              <span className="ll:ml-auto ll:pl-3 ll:text-[10px] ll:text-muted-foreground">
                {shortcut}
              </span>
            </Button>
          ),
        )}
      </PopoverContent>
    </Popover>
  );
};
