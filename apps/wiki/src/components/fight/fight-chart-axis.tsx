import { formatNumber } from "@lootlog/domain/locale";

type FightChartAxisProps = {
  ticks: readonly number[];
  unit: string;
};

export function FightChartAxis({ ticks, unit }: FightChartAxisProps) {
  return (
    <div
      aria-hidden="true"
      className="flex justify-between text-[0.6875rem] text-muted-foreground tabular-nums"
    >
      {ticks.map((tick, index) => (
        <span key={index}>
          {index === ticks.length - 1
            ? `${formatNumber(tick)} ${unit}`
            : formatNumber(tick)}
        </span>
      ))}
    </div>
  );
}
