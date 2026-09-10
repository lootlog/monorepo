import { useState, type RefObject } from "react";
import { Eye, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ActivePartyGatheringSummary } from "@lootlog/client/main";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChatGatheringDetails } from "./chat-gathering-details";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function ChatHiddenGatherings({
  gatherings,
  onRestore,
  triggerRef,
}: {
  gatherings: ActivePartyGatheringSummary[];
  onRestore: (notificationId: string) => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const { t } = useTranslation("chat");
  const [open, setOpen] = useState(false);
  const label = t("gatherings.hidden", { count: gatherings.length });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          className="ll:min-w-6 ll:h-6 ll:gap-1 ll:px-1 ll:mt-2 ll:mr-2 ll:bg-black/85 ll:shadow-sm ll:focus-visible:outline-2 ll:focus-visible:outline-ring"
          aria-label={label}
          title={label}
        >
          <UsersRound aria-hidden className="ll:size-3.5" />
          <span aria-hidden className="ll:text-[10px] ll:tabular-nums">
            {gatherings.length}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        aria-label={label}
        className="ll:w-72 ll:max-w-[calc(100vw-32px)] ll:p-1"
      >
        <ul className="ll:m-0 ll:max-h-48 ll:list-none ll:overflow-y-auto ll:p-0">
          {gatherings.map((gathering) => (
            <li
              key={gathering.notificationId}
              className="ll:flex ll:items-start ll:gap-2 ll:py-1"
            >
              <div className="ll:min-w-0 ll:flex-1">
                <div className="ll:text-[11px] ll:text-gray-100">
                  {gathering.organizerName}
                </div>
                <ChatGatheringDetails {...gathering} />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="ll:size-6 ll:shrink-0 ll:p-0"
                    aria-label={t("gatherings.restoreNamed", {
                      name:
                        gathering.npc?.name ??
                        gathering.description ??
                        gathering.organizerName,
                    })}
                    onClick={() => {
                      setOpen(false);
                      onRestore(gathering.notificationId);
                    }}
                  >
                    <Eye aria-hidden size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {t("gatherings.restore")}
                </TooltipContent>
              </Tooltip>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
