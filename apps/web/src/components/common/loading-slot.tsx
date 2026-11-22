import { Spinner, useSpinnerOverride } from "@lootlog/ui/components/spinner";
import { cn } from "cn";

type LoadingSlotProps = {
  size?: "default" | "small";
  className?: string;
};

export const LoadingSlot = ({
  size = "default",
  className,
}: LoadingSlotProps) => {
  const hasThemeSpinner = useSpinnerOverride() !== null;

  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex animate-placeholder-in", className)}
    >
      {hasThemeSpinner ? (
        <Spinner className={size === "small" ? "size-8" : "size-16"} />
      ) : (
        <span
          className={cn("loot-slot", size === "small" && "loot-slot--small")}
        >
          <span className="loot-slot__rim">
            <span />
            <span />
            <span />
          </span>
        </span>
      )}
    </span>
  );
};
