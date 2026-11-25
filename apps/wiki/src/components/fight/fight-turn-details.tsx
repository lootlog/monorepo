import { ChevronDown, ChevronUp, X } from "lucide-react";
import { BATTLE_TEXT_COLORS } from "@lootlog/battle-ui/lib/battle-color-palette";
import { formatNumber } from "@lootlog/domain/locale";
import { Button } from "@lootlog/ui/components/button";
import { t } from "@/i18n/messages";
import type { FightTurn } from "@/lib/fight/fight-run";
import { turnEventLabel } from "@/lib/fight/fight-turn-labels";
import { FightTurnChances } from "./fight-turn-chances";
import { FightTurnFighterEffects } from "./fight-turn-fighter-effects";
import { FightTurnState } from "./fight-turn-state";

const TEAM_CLASSES = [
  BATTLE_TEXT_COLORS.team.friendly,
  BATTLE_TEXT_COLORS.team.enemy,
] as const;

type FightTurnDetailsProps = {
  number: number;
  turn: FightTurn;
  isEnd: boolean;
  nameOf: (index: number) => string;
  onPrevious: (() => void) | null;
  onNext: (() => void) | null;
  onClose: () => void;
};

export function FightTurnDetails({
  number,
  turn,
  isEnd,
  nameOf,
  onPrevious,
  onNext,
  onClose,
}: FightTurnDetailsProps) {
  const { event, before, after } = turn;

  return (
    <section
      aria-labelledby="fight-turn-title"
      className="flex flex-col gap-4 p-3"
    >
      <header className="flex items-start gap-2">
        <div className="flex min-w-0 flex-col">
          <h3 id="fight-turn-title" className="text-sm font-semibold">
            {t("fightPage.turn.title", { number: formatNumber(number) })}
          </h3>
          <p className="text-xs text-muted-foreground">
            {turnEventLabel(event, isEnd, nameOf)}
          </p>
        </div>
        <div className="ml-auto flex shrink-0 gap-1">
          <Button
            size="icon-xs"
            variant="outline"
            onClick={onPrevious ?? undefined}
            disabled={!onPrevious}
            aria-label={t("fightPage.turn.previous")}
            title={t("fightPage.turn.previous")}
          >
            <ChevronUp aria-hidden="true" />
          </Button>
          <Button
            size="icon-xs"
            variant="outline"
            onClick={onNext ?? undefined}
            disabled={!onNext}
            aria-label={t("fightPage.turn.next")}
            title={t("fightPage.turn.next")}
          >
            <ChevronDown aria-hidden="true" />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={onClose}
            aria-label={t("fightPage.turn.close")}
            title={t("fightPage.turn.close")}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      </header>
      {event?.kind === "strike" ? (
        <FightTurnChances event={event} nameOf={nameOf} />
      ) : null}
      <div className="flex flex-col gap-1">
        <FightTurnState before={before} after={after} />
        <p className="text-xs text-muted-foreground">
          {t("fightPage.turn.changes")}
        </p>
      </div>
      <section
        aria-labelledby="fight-turn-effects"
        className="flex flex-col gap-3"
      >
        <h3
          id="fight-turn-effects"
          className="border-b border-border/50 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
        >
          {t("fightPage.turn.effectsTitle")}
        </h3>
        {after.map((fighter, index) => (
          <FightTurnFighterEffects
            key={index}
            index={index}
            fighter={fighter}
            nameOf={nameOf}
            nameClass={TEAM_CLASSES[index] ?? ""}
          />
        ))}
      </section>
    </section>
  );
}
