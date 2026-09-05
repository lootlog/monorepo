import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { HelpCircle } from "lucide-react";
import {
  getScoringFactorDescription,
  getScoringFactorLabel,
} from "../../utils/scoring-rule-labels";
import type {
  EventScoringNumericFactor,
  EventScoringBooleanFactor,
} from "@lootlog/domain/scoring";

type ScoringFactor = EventScoringNumericFactor | EventScoringBooleanFactor;
export const ScoringFactorSelect = ({
  value,
  onChange,
  factors,
}: {
  value: ScoringFactor;
  onChange: (value: string | null) => void;
  factors: readonly ScoringFactor[];
}) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1">
      <Select
        value={value}
        onValueChange={onChange}
        items={factors.map((factor) => ({
          value: factor,
          label: <>{getScoringFactorLabel(factor, t)}</>,
        }))}
      >
        <SelectTrigger size="sm" className="h-8 text-[12px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {factors.map((factor) => (
            <SelectItem key={factor} value={factor}>
              {getScoringFactorLabel(factor, t)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Tooltip>
        <TooltipTrigger
          render={
            <HelpCircle className="size-3.5 text-muted-foreground/30 shrink-0 cursor-help" />
          }
        />
        <TooltipContent side="top" className="max-w-[220px]">
          <p className="text-xs">{getScoringFactorDescription(value, t)}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
