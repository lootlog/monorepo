import { cn } from "cn";

type FilterOptionCountProps = {
  label: string;
  count: number;
  countClassName?: string;
};

export const FilterOptionCount = ({
  label,
  count,
  countClassName,
}: FilterOptionCountProps) => (
  <span className="flex min-w-0 flex-1 items-center gap-2">
    <span className="truncate">{label}</span>
    <span
      className={cn(
        "ml-auto text-muted-foreground tabular-nums",
        countClassName,
      )}
    >
      {count}
    </span>
  </span>
);
