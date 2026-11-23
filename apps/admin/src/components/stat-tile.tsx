import { useAnimatedNumber } from "@lootlog/ui/hooks/use-animated-number";

export function StatTile({ label, value }: { label: string; value: number }) {
  const shown = useAnimatedNumber(value);

  return (
    <div className="flex flex-col-reverse justify-end gap-1 rounded-lg border border-border bg-card px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold tabular-nums">
        {Math.round(shown)}
      </dd>
    </div>
  );
}
