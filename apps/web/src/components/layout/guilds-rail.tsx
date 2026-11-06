import { UserNavItem } from "@/components/layout/user-nav-item";
import { Separator } from "@lootlog/ui/components/separator";
import type { ReactNode } from "react";

type GuildsRailProps = {
  children: ReactNode;
  onSelect?: () => void;
};

/** The desktop server rail: the personal space over a scrolling list. */
export const GuildsRail = ({ children }: GuildsRailProps) => (
  <div className="flex flex-col gap-2 w-16 border-r border-solid border-sidebar-border pt-2 pb-2 h-full overflow-hidden">
    <UserNavItem />
    <Separator className="-mt-[1px] bg-sidebar-border" />
    <div className="flex-1 h-24 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {children}
    </div>
  </div>
);
