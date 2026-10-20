import { Flag } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { toolbarStripDividerClassName } from "@/components/ui/toolbar-strip";
import { QuickAccessButton } from "@/features/quick-access/components/quick-access-button";
import { canPickFaction } from "./faction-war-pick-state";
import { useFactionWarPickStore } from "./faction-war-pick.store";
import { useCurrentFactionWar } from "./use-current-faction-war";

/**
 * The way back to the pick screen: a quick access tile, marked with a dot,
 * for as long as the running war still waits for this player's pick.
 */
export const FactionWarPickButton: FC = () => {
  const { t } = useTranslation("factionWar");
  const { data: war } = useCurrentFactionWar();
  const open = useFactionWarPickStore((state) => state.open);
  const setOpen = useFactionWarPickStore((state) => state.setOpen);

  if (!canPickFaction(war)) return null;

  return (
    <>
      <QuickAccessButton
        className="ll:relative"
        label={t("quickAccess.pick")}
        active={open}
        onClick={() => setOpen(true)}
        icon={
          <>
            <Flag aria-hidden="true" className="ll:size-4 ll:text-orange-300" />
            <span
              aria-hidden
              className="ll:pointer-events-none ll:absolute ll:right-0.5 ll:top-0.5 ll:size-2 ll:rounded-full ll:bg-orange-400"
            />
          </>
        }
      />
      <div
        aria-hidden="true"
        className={`${toolbarStripDividerClassName} ll:mx-1 ll:h-4`}
      />
    </>
  );
};
