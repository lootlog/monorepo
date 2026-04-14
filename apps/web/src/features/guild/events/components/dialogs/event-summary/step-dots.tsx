import { cn } from "@lootlog/ui/lib/utils";

interface StepDotsProps {
  total: number;
  current: number;
  onSelect: (index: number) => void;
  getAriaLabel: (index: number) => string;
}

export const StepDots = ({
  total,
  current,
  onSelect,
  getAriaLabel,
}: StepDotsProps) => {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, index) => (
        <button
          key={index}
          type="button"
          aria-label={getAriaLabel(index)}
          onClick={() => onSelect(index)}
          className={cn(
            "h-2.5 rounded-full transition-all",
            current === index
              ? "w-8 bg-primary"
              : "w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50",
          )}
        />
      ))}
    </div>
  );
};
