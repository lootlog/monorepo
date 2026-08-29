import { lazy, Suspense } from "react";
import { cn } from "@lootlog/ui/lib/utils";

const RiasMagicSpinner = lazy(() =>
  import("./rias-magic-spinner").then((module) => ({
    default: module.RiasMagicSpinner,
  })),
);

export const LazyRiasMagicSpinner = ({ className }: { className?: string }) => {
  return (
    <Suspense
      fallback=<div
        className={cn(
          "size-14 animate-spin rounded-full border-2 border-current border-t-transparent",
          className,
        )}
      />
    >
      <RiasMagicSpinner className={className} />
    </Suspense>
  );
};
