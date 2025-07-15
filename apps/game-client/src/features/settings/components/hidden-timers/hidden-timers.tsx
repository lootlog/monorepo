import { Tile } from "@/components/ui/tile";
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

  const sortedHiddenTimers = hiddenTimersForAccount
    ? [...hiddenTimersForAccount].sort((a, b) => a.localeCompare(b))
    : [];

  return (
    <div className="ll-py-4">
      {sortedHiddenTimers && sortedHiddenTimers.length > 0 && (
        <span className="ll-grid ll-gap-1 ll-grid-cols-2 ll-w-full ll-pr-4 ll-box-border">
          {sortedHiddenTimers.map((timer) => {
            return (
              <Tile key={timer}>
                <span className="ll-flex ll-justify-between ll-items-center ll-w-full ll-px-1 ll-box-border">
                  {timer}
                  <button
                    type="button"
                    className="ll-close-button ll-custom-cursor-pointer ll-mb-0.5"
                    onClick={() => handleRemoveTimer(timer)}
                  />
                </span>
              </Tile>
            );
          })}
        </span>
      )}
      {!hiddenTimersForAccount || hiddenTimersForAccount.length === 0
        ? "Brak ukrytych timerów dla wybranej postaci."
        : null}
    </div>
  );
};
