import {
  BINGO_MAX_BOARD_SIZE,
  BINGO_MIN_BOARD_SIZE,
} from "@lootlog/schema/bingo";
import { Button } from "@lootlog/ui/components/button";
import { Label } from "@lootlog/ui/components/label";
import { range } from "es-toolkit";
import { useId } from "react";
import { useTranslation } from "react-i18next";

const BOARD_SIZES = range(BINGO_MIN_BOARD_SIZE, BINGO_MAX_BOARD_SIZE + 1);

type BingoBoardSizeFieldProps = {
  readonly value: number;
  readonly onChange: (size: number) => void;
  readonly disabled?: boolean;
  readonly hint?: string | null;
};

export const BingoBoardSizeField = ({
  value,
  onChange,
  disabled = false,
  hint = null,
}: BingoBoardSizeFieldProps) => {
  const { t } = useTranslation();
  const labelId = useId();
  const hintId = useId();

  return (
    <div className="space-y-1.5">
      <Label id={labelId}>{t("bingo.boardSize.label")}</Label>
      <div
        role="group"
        aria-labelledby={labelId}
        aria-describedby={hint ? hintId : undefined}
        className="flex flex-wrap gap-1.5"
      >
        {BOARD_SIZES.map((candidate) => (
          <Button
            key={candidate}
            type="button"
            size="sm"
            variant={value === candidate ? "default" : "outline"}
            aria-pressed={value === candidate}
            disabled={disabled}
            onClick={() => onChange(candidate)}
          >
            {t("bingo.boardSize.value", { size: candidate })}
          </Button>
        ))}
      </div>
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
};
