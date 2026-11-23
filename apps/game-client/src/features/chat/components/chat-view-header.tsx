import { GuildSwitcher } from "@/components/guild-switcher";
import { toolbarStripClassName } from "@/components/ui/toolbar-strip";
import { cn } from "cn";

type Props = {
  selectedGuildId: string;
  onGuildChange: (guildId: string) => void;
  unreadGuildIds: Set<string>;
};

export function ChatViewHeader({
  selectedGuildId,
  onGuildChange,
  unreadGuildIds,
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
        className="ll:min-w-0 ll:flex-1"
        value={selectedGuildId}
        onChange={onGuildChange}
        unreadGuildIds={unreadGuildIds}
      />
    </div>
  );
}
