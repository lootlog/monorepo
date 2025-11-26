import { Timers as GuildTimers } from "@/features/guild/components/timers/timers";

export const Timers: React.FC = () => {
  return (
    <div className="flex flex-col w-full h-full overflow-hidden bg-background/30">
      <div className="flex-1 overflow-auto">
        <GuildTimers />
      </div>
    </div>
  );
};
