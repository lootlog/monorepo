import { formatNumber } from "@lootlog/domain/locale";
import { useAnimatedNumber } from "@lootlog/ui/hooks/use-animated-number";
import { useChangeCount } from "@lootlog/ui/hooks/use-change-count";
import { cn } from "cn";

export function StatsTileNumber({ value }: { value: number }) {
  const shown = useAnimatedNumber(value);
  const changeCount = useChangeCount(value);

  return (
    <span
      key={changeCount}
      className={cn(
        "-mx-1 rounded-sm px-1",
        changeCount > 0 && "animate-arrival motion-reduce:animate-none",
      )}
    >
      {formatNumber(Number.isInteger(value) ? Math.round(shown) : shown)}
    </span>
  );
}
