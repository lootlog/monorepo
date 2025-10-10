import { SidebarTrigger } from "@lootlog/ui/components/sidebar";
import { PageHeader } from "@/components/layout/page-header";

export const Home: React.FC = () => {
  return (
    <div>
      <PageHeader>
        <div className="w-full flex">
          <SidebarTrigger />
          <div className="flex justify-between w-full pl-2 items-center">
            <div className="flex flex-row items-center gap-4">
              <h1 className="font-semibold p-0">Dashboard</h1>
            </div>
          </div>
        </div>
      </PageHeader>
      <div className="w-full h-[calc(100%-64px)] flex items-center justify-center">
        Home screen, tutaj będzie dashboard, statystyki, itp. (WIP)
      </div>
    </div>
  );
};
