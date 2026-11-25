import { cn } from "cn";
import { t } from "@/i18n/messages";
import { FIGHT_SIDES } from "./fight-sides";

const NAMES = ["fightPage.myName", "fightPage.opponentName"] as const;

export function FightSidesLegend() {
  return (
    <span className="flex items-center gap-3 text-xs text-muted-foreground">
      {FIGHT_SIDES.map((side, index) => (
        <span key={side.fill} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn("size-2 rounded-xs", side.fill)}
          />
          {t(NAMES[index] ?? NAMES[0])}
        </span>
      ))}
    </span>
  );
}
