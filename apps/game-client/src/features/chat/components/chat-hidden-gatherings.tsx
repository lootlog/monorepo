import { useState, type RefObject } from "react";
import { UsersRound, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ActivePartyGatheringSummary } from "@lootlog/client/main";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChatGatheringListItem } from "./chat-gathering-list-item";

export function ChatHiddenGatherings({
  gatherings,
  activeGatherings,
  onRestore,
  onApply,
  pending,
  disabled,
  triggerRef,
}: {
  gatherings: ActivePartyGatheringSummary[];
  activeGatherings: ActivePartyGatheringSummary[];
  onRestore: (notificationId: string) => void;
  onApply: (gathering: ActivePartyGatheringSummary) => void;
  pending: boolean;
  disabled: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const { t } = useTranslation("chat");
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(gatherings.length > 0);
  const label = t("gatherings.hidden", { count: gatherings.length });
  const visible = hidden ? gatherings : activeGatherings;

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setHidden(gatherings.length > 0);
        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          aria-label={label}
          className="ll:min-w-6 ll:h-6 ll:gap-1 ll:px-1 ll:bg-black/85 ll:shadow-sm ll:focus-visible:outline-2 ll:focus-visible:outline-ring"
        >
          <UsersRound aria-hidden size={14} />
          <span className="ll:text-[10px] ll:tabular-nums">
            ({gatherings.length + activeGatherings.length})
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        aria-label={t("gatherings.listTitle")}
        className="ll:w-[240px] ll:max-w-[calc(100vw-32px)] ll:overflow-hidden ll:rounded-[7px] ll:border-gray-400/40 ll:bg-[#130d1a] ll:p-0 ll:text-gray-100"
      >
        <div className="ll:flex ll:items-center ll:justify-between ll:px-2 ll:py-1 ll:text-[12px]">
          <strong>{t("gatherings.listTitle")}</strong>
          <Button
            variant="ghost"
            className="ll:size-6 ll:border-0 ll:p-0"
            aria-label={t("gatherings.closeList")}
            onClick={() => setOpen(false)}
          >
            <X size={14} aria-hidden />
          </Button>
        </div>
        <div className="ll:flex ll:border-solid ll:border-x-0 ll:border-y ll:border-gray-400/40">
          {[false, true].map((isHidden) => (
            <Button
              key={String(isHidden)}
              variant="ghost"
              aria-pressed={hidden === isHidden}
              className={`ll:flex-1 ll:h-7 ll:rounded-none ll:border-0 ll:text-[11px] ${hidden === isHidden ? "ll:bg-purple-500/20" : ""}`}
              onClick={() => setHidden(isHidden)}
            >
              {t(isHidden ? "gatherings.hiddenTab" : "gatherings.activeTab", {
                count: isHidden ? gatherings.length : activeGatherings.length,
              })}
            </Button>
          ))}
        </div>
        <ul className="ll:m-0 ll:max-h-48 ll:list-none ll:overflow-y-auto ll:p-0">
          {visible.map((gathering) => (
            <ChatGatheringListItem
              key={gathering.notificationId}
              gathering={gathering}
              hidden={hidden}
              pending={pending}
              disabled={disabled}
              onApply={() => {
                onApply(gathering);
                setOpen(false);
              }}
              onRestore={() => {
                setOpen(false);
                onRestore(gathering.notificationId);
              }}
            />
          ))}
        </ul>
        {visible.length === 0 && (
          <p className="ll:m-0 ll:p-3 ll:text-[11px] ll:text-muted-foreground">
            {t("gatherings.emptyList")}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
