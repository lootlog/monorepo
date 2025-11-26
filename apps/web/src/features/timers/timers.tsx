import { Timers as GuildTimers } from "@/features/guild/components/timers/timers";

export const Timers: React.FC = () => {
  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <div className="flex-1 overflow-auto bg-background/20">
        <div className="max-w-3xl mx-auto p-4">
          <GuildTimers />
        </div>
      </div>
    </div>
  );
};
