import { PageHeader } from "@/components/layout/page-header";
import { SidebarTrigger } from "@lootlog/ui/components/sidebar";
import { Timers as GuildTimers } from "@/features/guild/components/timers/timers";

export const Timers: React.FC = () => {
  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <PageHeader>
        <div className="flex flex-row gap-2 items-center">
          <SidebarTrigger />
          <h1 className="font-semibold text-xl p-0">Timery</h1>
        </div>
      </PageHeader>

      <div className="flex-1 overflow-auto bg-background/20">
        <div className="max-w-3xl mx-auto p-4">
          <GuildTimers />
        </div>
      </div>
    </div>
  );
};
