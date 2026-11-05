import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

/**
 * The frame the editor and the result share, so a spin swaps the contents
 * without moving the wheel, the entrants or the footer: the wheel with a row
 * of actions under it, and the entrants with the spin or the result in the
 * footer right below them.
 */
export const LootDrawLayout = ({
  wheel,
  wheelActions,
  entrantsCount,
  entrantsAction,
  entrants,
  footer,
  below,
}: {
  wheel: ReactNode;
  wheelActions?: ReactNode;
  entrantsCount: number;
  entrantsAction?: ReactNode;
  entrants: ReactNode;
  footer: ReactNode;
  below?: ReactNode;
}) => {
  const { t } = useTranslation();

  return (
    <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
      <div className="grid justify-items-center gap-2">
        {wheel}
        <div className="flex h-8 gap-1">{wheelActions}</div>
      </div>
      <div className="grid min-w-0 gap-3">
        <div className="min-w-0 overflow-hidden rounded-lg border border-border">
          <div className="flex min-h-11 items-center justify-between gap-3 border-b border-border px-3 py-1.5 sm:px-4">
            <p className="text-sm font-semibold">
              {t("loots.details.draw.entrants", { count: entrantsCount })}
            </p>
            {entrantsAction}
          </div>
          <ul className="divide-y divide-border/50">{entrants}</ul>
          <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-t border-border bg-card/20 px-3 py-3 sm:px-4">
            {footer}
          </div>
        </div>
        {below}
      </div>
    </div>
  );
};
