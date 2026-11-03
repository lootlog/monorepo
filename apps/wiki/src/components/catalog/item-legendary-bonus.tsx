import { TruncatedText } from "@/components/truncated-text";
import { t } from "@/i18n/messages";
import { findLegendaryBonus } from "@/lib/legendary-bonuses";

/** The item's legendary bonus with its icon; nothing without one. */
export function ItemLegendaryBonus({ stat }: { stat: string }) {
  const bonus = findLegendaryBonus(stat);

  if (!bonus) return null;

  return (
    <span className="flex min-w-0 items-center gap-1 text-xs text-emerald-400">
      <bonus.icon aria-hidden="true" className="size-3 shrink-0" />
      <TruncatedText label={t(`legendaryBonus.${bonus.name}`)} />
    </span>
  );
}
