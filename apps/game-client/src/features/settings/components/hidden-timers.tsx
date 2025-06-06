import { ScrollArea } from "@/components/ui/scroll-area";
import { TimerTile } from "@/features/timers/components/timer-tile";
import { useGlobalStore } from "@/store/global.store";
import { useTimersStore } from "@/store/timers.store";
import { FC } from "react";

export type HiddenTimersProps = {
  characterId?: string;
};

export const HiddenTimers: FC<HiddenTimersProps> = ({ characterId }) => {
  const { accountId } = useGlobalStore((state) => state.gameState);
  const { hiddenTimers, removeHiddenTimer } = useTimersStore();

  const key = `${accountId}${characterId}`;
  const hiddenTimersForAccount = hiddenTimers[key];

  const handleRemoveTimer = (timer: string) => {
    if (!accountId || !characterId) return;

    removeHiddenTimer(accountId, characterId, timer);
  };

  return (
    <ScrollArea className="ll-h-64 ll-w-full" type="auto">
      {hiddenTimersForAccount && hiddenTimersForAccount.length > 0 && (
        <span className="ll-grid ll-gap-1 ll-grid-cols-2 ll-w-full ll-pr-4 ll-box-border">
          {hiddenTimersForAccount.map((timer) => {
            return (
              <TimerTile key={timer}>
                <span className="ll-flex ll-justify-between ll-items-center ll-w-full ll-px-1 ll-box-border">
                  {timer}
                  <button
                    type="button"
                    className="ll-close-button ll-custom-cursor-pointer ll-mb-0.5"
                    onClick={() => handleRemoveTimer(timer)}
                  />
                </span>
              </TimerTile>
            );
          })}
        </span>
      )}
      {!hiddenTimersForAccount || hiddenTimersForAccount.length === 0
        ? "Brak ukrytych timerów dla wybranej postaci."
        : null}
    </ScrollArea>
  );
};
