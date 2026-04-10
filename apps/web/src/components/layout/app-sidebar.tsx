import { GuildsSelector } from "@/components/layout/guilds-selector";
import { UserMenu } from "@/components/layout/user-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
} from "@lootlog/ui/components/sidebar";
import type { ReactNode } from "react";

type AppSidebarProps = {
  navigation?: ReactNode;
};

export const AppSidebar = ({ navigation }: AppSidebarProps) => {
  return (
    <Sidebar>
      <SidebarContent className="h-full bg-sidebar">
        <SidebarGroup className="h-full p-0">
          <SidebarGroupContent className="h-full">
            <SidebarMenu className="flex h-full flex-row gap-0">
              <GuildsSelector />
              {navigation ?? <div className="flex-1 bg-sidebar" />}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="bg-sidebar p-0">
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
};
