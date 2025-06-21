import { GuildsNav } from "@/components/layout/guilds-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { UserSidebarNav } from "@/components/layout/user-sidebar-nav";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { FC } from "react";

export const UserSidebar: FC = () => {
  return (
    <Sidebar>
      <SidebarContent className="bg-background h-full">
        <SidebarGroup className="p-0 h-full">
          <SidebarGroupContent className="h-full">
            <SidebarMenu className="flex flex-row h-full gap-0">
              <GuildsNav />
              {/* <SidebarNav /> */}
              <UserSidebarNav />
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
