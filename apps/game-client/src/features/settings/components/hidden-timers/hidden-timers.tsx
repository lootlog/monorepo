import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { Tile } from "@/components/ui/tile";
import { useTimersStore } from "@/store/timers.store";
import { XIcon } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type HiddenTimersProps = {
  guildId?: string;
};

export const HiddenTimers: FC<HiddenTimersProps> = ({ guildId }) => {
  const { hiddenTimers, revealTimer, generalConfig } = useTimersStore();
  const { t } = useTranslation();

  const key = generalConfig.timersGrouping ? "global" : guildId;
  const hiddenTimersForAccount = key ? hiddenTimers[key] : undefined;

  const handleRemoveTimer = (timer: string) => {
    if (!key) return;

    revealTimer(key, timer);
  };

  const sortedHiddenTimers = hiddenTimersForAccount
    ? [...hiddenTimersForAccount].sort((a, b) => a.localeCompare(b))
    : [];

  const uniqueHiddenTimers = Array.from(new Set(sortedHiddenTimers));

  return (
    <div className="ll:flex ll:flex-col ll:gap-2">
      {uniqueHiddenTimers && uniqueHiddenTimers.length > 0 && (
        <span className="ll:grid ll:w-full ll:grid-cols-2 ll:gap-2 ll:box-border">
          {sortedHiddenTimers.map((timer) => {
            return (
              <SettingsPanel key={timer} className="ll:px-2 ll:py-1.5">
                <Tile className="ll:border-none ll:bg-transparent ll:px-0 ll:hover:bg-transparent">
                  <span className="ll:flex ll:w-full ll:items-center ll:justify-between ll:px-1 ll:box-border">
                    <span className="ll:min-w-0 ll:truncate ll:text-[12px] ll:text-white">
                      {timer}
                    </span>
                    <XIcon
                      size="14"
                      type="button"
                      className="ll-custom-cursor-pointer ll:shrink-0 ll:stroke-gray-300 ll:transition-colors ll:hover:stroke-gray-100"
                      onClick={() => handleRemoveTimer(timer)}
                    />
                  </span>
                </Tile>
              </SettingsPanel>
            );
          })}
        </span>
      )}
      {!hiddenTimersForAccount || hiddenTimersForAccount.length === 0 ? (
        <SettingsEmptyState>
          {t("settings.hiddenTimers.emptyState")}
        </SettingsEmptyState>
      ) : null}
    </div>
  );
};
