import { GuildsNav } from "@/components/layout/guilds-nav";
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
      <SidebarContent className="bg-background h-full">
        <SidebarGroup className="p-0 h-full">
          <SidebarGroupContent className="h-full">
            <SidebarMenu className="flex flex-row h-full gap-0">
              <GuildsNav />
              <SidebarNav />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="bg-background p-0">
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
};
