import { GuildsSelector } from "@/components/layout/guilds-selector";
import { GuildsSidebarNav } from "@/components/layout/guilds-sidebar-nav";
import { UserMenu } from "@/components/layout/user-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
} from "@lootlog/ui/components/sidebar";
import type { FC } from "react";

export const GuildSidebar: FC = () => {
  return (
    <Sidebar>
      <SidebarContent className="h-full bg-background">
        <SidebarGroup className="p-0 h-full">
          <SidebarGroupContent className="h-full">
            <SidebarMenu className="flex flex-row h-full gap-0">
              <GuildsSelector />
              <GuildsSidebarNav />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-0">
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
};
