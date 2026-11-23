import { GuildButton } from "@/components/guild-button";
import { GuildAvatar } from "@/components/guild-avatar";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { GuildIdentity } from "@/lib/api/generated-helpers";
import { EyeOff } from "lucide-react";
import type { FC } from "react";

type GuildSwitcherItemProps = {
  guild: GuildIdentity;
  hideLabel: string;
  isSelected: boolean;
  onClick: () => void;
  onHide: () => void;
  unreadLabel: string | null;
};

export const GuildSwitcherItem: FC<GuildSwitcherItemProps> = ({
  guild,
  hideLabel,
  isSelected,
  onClick,
  onHide,
  unreadLabel,
}) => (
  <ContextMenu>
    <ContextMenuTrigger asChild>
      <div className="ll:border-0 ll:border-solid ll:border-separator ll:last:border-r">
        <GuildButton
          isSelected={isSelected}
          onClick={onClick}
          tooltipLabel={guild.name}
          unreadLabel={unreadLabel}
        >
          <GuildAvatar guild={guild} size="sm" />
        </GuildButton>
      </div>
    </ContextMenuTrigger>
    <ContextMenuContent>
      <ContextMenuItem onSelect={onHide}>
        <EyeOff aria-hidden className="ll:mr-1.5 ll:size-3.5" />
        {hideLabel}
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
);
