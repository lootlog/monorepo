import { GuildSwitcher } from "@/components/guild-switcher";
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
    <div className="ll:flex ll:shrink-0 ll:items-center ll:gap-1 ll:p-1">
      <GuildSwitcher
        allowAll
        className="ll:min-w-0 ll:flex-1"
        value={selectedGuildId}
        onChange={onGuildChange}
        unreadCountByGuildId={unreadCountByGuildId}
        unreadGuildIds={unreadGuildIds}
      />
      {actions}
    </div>
  );
}
