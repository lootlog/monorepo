import { PageHeader } from "@/components/layout/page-header";
import { SidebarTrigger } from "@/components/ui/sidebar";

export const Reservations: React.FC = () => {
  return (
    <div className="flex flex-row w-full h-[calc(100%-65px)]">
      <PageHeader>
        <div className="flex flex-row gap-2">
          <SidebarTrigger />
          <h1 className="font-semibold text-xl p-0">Rezerwacje</h1>
        </div>
      </PageHeader>
    </div>
  );
};
