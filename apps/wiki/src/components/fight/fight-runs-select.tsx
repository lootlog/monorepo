import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import { formatNumber } from "@lootlog/domain/locale";
import { t } from "@/i18n/messages";
import { SIMULATION_RUN_OPTIONS } from "@/lib/fight/fight-run";

const RUN_OPTIONS = SIMULATION_RUN_OPTIONS.map((runs) => ({
  value: String(runs),
  label: t("fightPage.runsOption", { runs: formatNumber(runs) }),
}));

type FightRunsSelectProps = {
  value: number;
  onChange: (runs: number) => void;
  disabled: boolean;
};

export function FightRunsSelect({
  value,
  onChange,
  disabled,
}: FightRunsSelectProps) {
  return (
    <Select
      value={String(value)}
      onValueChange={(next) => {
        const runs = SIMULATION_RUN_OPTIONS.find(
          (option) => String(option) === next,
        );

        if (runs) onChange(runs);
      }}
      items={RUN_OPTIONS}
      disabled={disabled}
    >
      <SelectTrigger size="sm" aria-label={t("fightPage.runsLabel")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {RUN_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
