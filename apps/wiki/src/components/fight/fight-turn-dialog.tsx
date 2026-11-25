import type { KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BATTLE_TEXT_COLORS } from "@lootlog/battle-ui/lib/battle-color-palette";
import { formatNumber } from "@lootlog/domain/locale";
import { Button } from "@lootlog/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
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

const SECTION_HEADING_CLASS =
  "border-b border-border/50 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase";

type OpenTurn = {
  number: number;
  turn: FightTurn;
  isEnd: boolean;
};

type FightTurnDialogProps = {
  open: OpenTurn | null;
  nameOf: (index: number) => string;
  onPrevious: (() => void) | null;
  onNext: (() => void) | null;
  onClose: () => void;
};

export function FightTurnDialog({
  open,
  nameOf,
  onPrevious,
  onNext,
  onClose,
}: FightTurnDialogProps) {
  const stepWithArrows = (event: KeyboardEvent) => {
    const step =
      event.key === "ArrowLeft"
        ? onPrevious
        : event.key === "ArrowRight"
          ? onNext
          : null;

    if (!step) return;

    event.preventDefault();
    step();
  };

  return (
    <Dialog
      open={open !== null}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        onKeyDown={stepWithArrows}
      >
        {open ? (
          <>
            <div className="flex items-start gap-3 border-b border-border/70 pr-12">
              <DialogHeader className="min-w-0 gap-1 pb-3">
                <DialogTitle>
                  {t("fightPage.turn.title", {
                    number: formatNumber(open.number),
                  })}
                </DialogTitle>
                <DialogDescription>
                  {turnEventLabel(open.turn.event, open.isEnd, nameOf)}
                </DialogDescription>
              </DialogHeader>
              <div className="ml-auto flex shrink-0 gap-1 pt-3">
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={onPrevious ?? undefined}
                  disabled={!onPrevious}
                  aria-label={t("fightPage.turn.previous")}
                  title={t("fightPage.turn.previous")}
                >
                  <ChevronLeft aria-hidden="true" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={onNext ?? undefined}
                  disabled={!onNext}
                  aria-label={t("fightPage.turn.next")}
                  title={t("fightPage.turn.next")}
                >
                  <ChevronRight aria-hidden="true" />
                </Button>
              </div>
            </div>
            <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-4 [scrollbar-width:thin] md:grid-cols-2">
              <div className="flex flex-col gap-6">
                {open.turn.event?.kind === "strike" ? (
                  <FightTurnChances event={open.turn.event} nameOf={nameOf} />
                ) : null}
                <section
                  aria-labelledby="fight-turn-effects"
                  className="flex flex-col gap-3"
                >
                  <h3 id="fight-turn-effects" className={SECTION_HEADING_CLASS}>
                    {t("fightPage.turn.effectsTitle")}
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
                    {open.turn.after.map((fighter, index) => (
                      <FightTurnFighterEffects
                        key={index}
                        index={index}
                        fighter={fighter}
                        nameOf={nameOf}
                        nameClass={TEAM_CLASSES[index] ?? ""}
                      />
                    ))}
                  </div>
                </section>
              </div>
              <div className="flex flex-col gap-1">
                <FightTurnState
                  before={open.turn.before}
                  after={open.turn.after}
                />
                <p className="text-xs text-muted-foreground">
                  {t("fightPage.turn.changes")}
                </p>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
