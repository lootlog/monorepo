import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";

type FightStepButtonsProps = {
  previousLabel: string;
  nextLabel: string;
  onPrevious: (() => void) | null;
  onNext: (() => void) | null;
};

export function FightStepButtons({
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
}: FightStepButtonsProps) {
  return (
    <div className="flex gap-1">
      <Button
        size="icon-xs"
        variant="outline"
        onClick={onPrevious ?? undefined}
        disabled={!onPrevious}
        aria-label={previousLabel}
        title={previousLabel}
      >
        <ChevronLeft aria-hidden="true" />
      </Button>
      <Button
        size="icon-xs"
        variant="outline"
        onClick={onNext ?? undefined}
        disabled={!onNext}
        aria-label={nextLabel}
        title={nextLabel}
      >
        <ChevronRight aria-hidden="true" />
      </Button>
    </div>
  );
}
