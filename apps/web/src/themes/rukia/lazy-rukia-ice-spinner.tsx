import { lazy, Suspense } from "react";
import { cn } from "@lootlog/ui/lib/utils";

const RukiaIceSpinner = lazy(() =>
  import("./rukia-ice-spinner").then((module) => ({
    default: module.RukiaIceSpinner,
  })),
);

export const LazyRukiaIceSpinner = ({ className }: { className?: string }) => {
  return (
    <Suspense
      fallback=<div
        className={cn(
          "size-14 animate-spin rounded-full border-2 border-current border-t-transparent",
          className,
        )}
      />
    >
      <RukiaIceSpinner className={className} />
    </Suspense>
  );
};
