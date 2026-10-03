import { Skeleton } from "@lootlog/ui/components/skeleton";

const DESKTOP_FILTER_WIDTHS = [
  "w-[150px]",
  "w-[160px]",
  "w-[160px]",
  "w-[150px]",
];

export const BattlesListFilterToolbarSkeleton = () => {
  return (
    <div
      aria-hidden="true"
      className="flex w-full min-w-0 flex-wrap items-center gap-2"
    >
      <Skeleton className="h-10 min-w-0 flex-1 rounded-xl md:basis-full xl:min-w-60 xl:flex-1 xl:basis-0" />
      <Skeleton className="h-10 w-24 shrink-0 rounded-xl md:hidden" />
      {DESKTOP_FILTER_WIDTHS.map((width, index) => (
        <Skeleton
          key={index}
          className={`hidden h-10 rounded-xl md:block ${width}`}
        />
      ))}
      <Skeleton className="hidden h-10 w-[104px] rounded-xl md:block" />
    </div>
  );
};
