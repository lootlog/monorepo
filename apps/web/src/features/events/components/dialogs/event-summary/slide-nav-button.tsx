import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/utils/cn";

interface SlideNavButtonProps {
  direction: "previous" | "next";
  disabled: boolean;
  onClick: () => void;
  label: string;
}

export const SlideNavButton = ({
  direction,
  disabled,
  onClick,
  label,
}: SlideNavButtonProps) => {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "pointer-events-auto absolute top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border/70 bg-background/80 text-foreground shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur-xl transition-all duration-200 sm:size-12",
        direction === "previous" ? "left-3 sm:left-4" : "right-3 sm:right-4",
        disabled
          ? "cursor-not-allowed opacity-35"
          : "hover:scale-105 hover:border-primary/40 hover:bg-background active:scale-95",
      )}
    >
      {direction === "previous" ? (
        <ArrowLeft className="size-4 sm:size-5" />
      ) : (
        <ArrowRight className="size-4 sm:size-5" />
      )}
    </button>
  );
};
