import { GuildButton } from "@/components/guild-button";
import { AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  buttonClassName: string;
  disabled: boolean;
  guild: GuildIdentity;
  hideLabel: string;
  isSelected: boolean;
  onClick: () => void;
  onHide: () => void;
  unreadBadge: string | null;
};

export const GuildSwitcherItem: FC<GuildSwitcherItemProps> = ({
  buttonClassName,
  disabled,
  guild,
  hideLabel,
  isSelected,
  onClick,
  onHide,
  unreadBadge,
}) => (
  <ContextMenu>
    <ContextMenuTrigger asChild>
      <div>
        <GuildButton
          isSelected={isSelected}
          disabled={disabled}
          onClick={onClick}
          tooltipLabel={guild.name}
          className={buttonClassName}
          unreadBadge={unreadBadge}
        >
          <AvatarImage
            src={guild.icon ?? undefined}
            alt={guild.name}
            className="ll:size-full ll:rounded-sm ll:object-cover"
          />
          <AvatarFallback className="ll:flex ll:h-full ll:w-full ll:items-center ll:justify-center ll:text-xs ll:font-semibold ll:leading-none">
            {guild.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </GuildButton>
      </div>
    </ContextMenuTrigger>
    <ContextMenuContent>
      <ContextMenuItem disabled={disabled} onSelect={onHide}>
        <EyeOff aria-hidden className="ll:mr-1.5 ll:size-3.5" />
        {hideLabel}
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
);
