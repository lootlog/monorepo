type FightKpiProps = {
  label: string;
  value: string;
  detail: string;
};

export function FightKpi({ label, value, detail }: FightKpiProps) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg leading-6 font-semibold tabular-nums">{value}</dd>
      <dd className="truncate text-xs text-muted-foreground tabular-nums">
        {detail}
      </dd>
    </div>
  );
}
