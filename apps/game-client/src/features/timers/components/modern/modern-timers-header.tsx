import type { FC } from "react";
import { GuildSwitcher } from "@/components/guild-switcher";
import { WorldSelector } from "@/components/world-selector";

type ModernTimersHeaderProps = {
  allowWorldSelection: boolean;
};

/** Organization avatars and, when enabled, the world picker in one compact row. */
export const ModernTimersHeader: FC<ModernTimersHeaderProps> = ({
  allowWorldSelection,
}) => (
  <div className="ll:flex ll:shrink-0 ll:flex-col ll:gap-(--ll-timers-space-xs) ll:px-1 ll:pt-(--ll-timers-space-xs) ll:pb-(--ll-timers-space-sm)">
    <GuildSwitcher className="ll:min-w-0" />
    {allowWorldSelection && <WorldSelector />}
  </div>
);
