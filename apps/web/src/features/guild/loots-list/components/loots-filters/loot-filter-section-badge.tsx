export const LootFilterSectionBadge = ({ count }: { count: number }) => {
  if (count === 0) return null;

  return (
    <span className="ml-2 inline-flex size-5 items-center justify-center rounded-md bg-primary/15 text-[11px] font-semibold tabular-nums text-primary">
      {count}
    </span>
  );
};
