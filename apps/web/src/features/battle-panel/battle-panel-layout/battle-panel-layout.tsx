import { PageHeader } from "@/components/layout/page-header";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { SidebarTrigger } from "@lootlog/ui/components/sidebar";
import { Outlet } from "react-router-dom";

export const BattlePanelLayout = () => {
  return (
    <div className="flex flex-row w-full h-full min-h-0">
      <div className="w-full h-full flex flex-col min-h-0 overflow-hidden">
        <PageHeader>
          <div className="flex flex-row gap-2 items-center justify-center">
            <SidebarTrigger />
            <h1 className="font-semibold p-0">Panel walk</h1>
          </div>
        </PageHeader>
        <ScrollArea className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto">
          <Outlet />
        </ScrollArea>
      </div>
    </div>
  );
};
