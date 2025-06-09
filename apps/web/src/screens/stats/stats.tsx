import { PageHeader } from "@/components/layout/page-header";
import { SidebarTrigger } from "@/components/ui/sidebar";

export const Stats: React.FC = () => {
  console.log("Stats");
  return (
    <div className="flex flex-row w-full h-[calc(100%-65px)]">
      <div className="w-full h-full">
        <PageHeader>
          <div className="flex flex-row gap-2">
            <SidebarTrigger />
            <h1 className="font-semibold text-xl p-0">Statystyki</h1>
          </div>
        </PageHeader>
      </div>
    </div>
  );
};
