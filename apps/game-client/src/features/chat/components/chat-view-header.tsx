import { GuildSwitcher } from "@/components/guild-switcher";
import {
  toolbarStripClassName,
  toolbarStripDividerClassName,
} from "@/components/ui/toolbar-strip";
import { cn } from "cn";
import type { ReactNode } from "react";

type Props = {
  selectedGuildId: string;
  onGuildChange: (guildId: string) => void;
  unreadCountByGuildId: Record<string, number>;
  unreadGuildIds: Set<string>;
  actions: ReactNode;
};

export function ChatViewHeader({
  selectedGuildId,
  onGuildChange,
  unreadCountByGuildId,
  unreadGuildIds,
  actions,
}: Props) {
  return (
    <div
      className={cn(
        toolbarStripClassName,
        "ll:flex ll:shrink-0 ll:items-stretch ll:mt-1",
      )}
    >
      <GuildSwitcher
        allowAll
        className="ll:min-w-0 ll:flex-1 ll:border-y-0 ll:bg-transparent"
        value={selectedGuildId}
        onChange={onGuildChange}
        unreadCountByGuildId={unreadCountByGuildId}
        unreadGuildIds={unreadGuildIds}
        variant="strip"
      />
      {actions ? (
        <div
          className={cn(
            toolbarStripDividerClassName,
            "ll:flex ll:shrink-0 ll:items-center ll:px-1",
          )}
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}
