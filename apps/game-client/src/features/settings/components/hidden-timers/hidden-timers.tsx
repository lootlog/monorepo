import { Tile } from "@/components/ui/tile";
import { useGlobalStore } from "@/store/global.store";
import { useTimersStore } from "@/store/timers.store";
import { XIcon } from "lucide-react";
import { FC } from "react";

export type HiddenTimersProps = {
  guildId?: string;
};

export const HiddenTimers: FC<HiddenTimersProps> = ({ guildId }) => {
  const { hiddenTimers, revealTimer, timersGrouping } = useTimersStore();

  const key = timersGrouping ? "global" : guildId;
  const hiddenTimersForAccount = hiddenTimers[key!];

  const handleRemoveTimer = (timer: string) => {
    if (!key) return;

    revealTimer(key, timer);
  };

  const sortedHiddenTimers = hiddenTimersForAccount
    ? [...hiddenTimersForAccount].sort((a, b) => a.localeCompare(b))
    : [];

  const uniqueHiddenTimers = Array.from(new Set(sortedHiddenTimers));

  return (
    <div className="ll-py-4">
      {uniqueHiddenTimers && uniqueHiddenTimers.length > 0 && (
        <span className="ll-grid ll-gap-1 ll-grid-cols-2 ll-w-full ll-box-border">
          {sortedHiddenTimers.map((timer) => {
            return (
              <Tile key={timer}>
                <span className="ll-flex ll-justify-between ll-items-center ll-w-full ll-px-1 ll-box-border">
                  {timer}
                  <XIcon
                    size="14"
                    type="button"
                    className="ll-custom-cursor-pointer ll-stroke-gray-300 hover:ll-stroke-gray-100 ll-transition-colors -ll-mr-0.5"
                    onClick={() => handleRemoveTimer(timer)}
                  />
                </span>
              </Tile>
            );
          })}
        </span>
      )}
      {!hiddenTimersForAccount || hiddenTimersForAccount.length === 0
        ? "Brak ukrytych timerów."
        : null}
    </div>
  );
};
