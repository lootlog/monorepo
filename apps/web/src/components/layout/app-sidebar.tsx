import { GuildsNav } from "@/components/layout/guilds-nav";
import { GuildSwitcher } from "@/components/layout/guild-switcher";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/layout/user-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { FC } from "react";

export const AppSidebar: FC = () => {
  return (
    <Sidebar>
      <SidebarContent className="bg-background">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <div className="flex items-center justify-center w-full p-2 border-b h-16">
                <GuildSwitcher />
              </div>
              <GuildsNav />
              <SidebarNav />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="bg-background p-0 py-1">
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
};
