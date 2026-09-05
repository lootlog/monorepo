import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { EVENT_SCORING_NUMERIC_OPERATORS } from "@lootlog/domain/scoring";

export const ScoringOperatorSelect = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string | null) => void;
}) => (
  <Select
    value={value}
    onValueChange={onChange}
    items={EVENT_SCORING_NUMERIC_OPERATORS.map((operator) => ({
      value: operator,
      label: <>{operator}</>,
    }))}
  >
    <SelectTrigger size="sm" className="h-8 text-[12px] font-mono">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {EVENT_SCORING_NUMERIC_OPERATORS.map((operator) => (
        <SelectItem key={operator} value={operator} className="font-mono">
          {operator}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
