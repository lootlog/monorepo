import { cn } from "@lootlog/ui/lib/utils";
import { AnimatedPanel } from "./animated-panel";

export type MetricTone =
  | "default"
  | "warm"
  | "danger"
  | "emerald"
  | "blue"
  | "yellow";

interface MetricCardProps {
  eyebrow: string;
  value: string;
  caption: string;
  tone?: MetricTone;
}

export const MetricCard = ({
  eyebrow,
  value,
  caption,
  tone = "default",
}: MetricCardProps) => {
  return (
    <AnimatedPanel
      delay={0.05}
      className={cn(
        "rounded-3xl border px-4 py-4 backdrop-blur-sm transition-colors",
        tone === "default" && "border-border/70 bg-background/70",
        tone === "warm" && "border-amber-400/30 bg-amber-500/10",
        tone === "danger" && "border-rose-500/30 bg-rose-500/10",
        tone === "emerald" && "border-emerald-500/30 bg-emerald-500/10",
        tone === "blue" &&
          "border-blue-500/45 bg-blue-500/16 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        tone === "yellow" && "border-yellow-500/30 bg-yellow-500/10",
      )}
    >
      <div className={cn("relative z-[1]")}>
        <p
          className={cn(
            "text-[10px] uppercase tracking-[0.24em] text-muted-foreground",
            tone === "blue" && "text-blue-800 dark:text-blue-200/90",
          )}
        >
          {eyebrow}
        </p>
        <p
          className={cn(
            "mt-3 text-2xl font-semibold leading-none sm:text-3xl",
            tone === "blue" && "text-blue-950 dark:text-blue-50",
          )}
        >
          {value}
        </p>
        <p
          className={cn(
            "mt-2 text-sm text-muted-foreground",
            tone === "blue" && "text-blue-900/80 dark:text-blue-100/75",
          )}
        >
          {caption}
        </p>
      </div>
    </AnimatedPanel>
  );
};
