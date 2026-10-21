import type { ReactNode } from "react";
import { Label } from "@lootlog/ui/components/label";
import { cn } from "cn";

interface ScoringFieldProps {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** A labelled control in the scoring editor, with an optional short hint. */
export const ScoringField = ({
  label,
  htmlFor,
  hint,
  className,
  children,
}: ScoringFieldProps) => (
  <div className={cn("grid min-w-0 content-start gap-1.5", className)}>
    <Label
      htmlFor={htmlFor}
      className="text-xs font-medium leading-snug text-muted-foreground"
    >
      {label}
    </Label>
    {children}
    {hint ? (
      <p className="text-xs leading-snug text-muted-foreground">{hint}</p>
    ) : null}
  </div>
);
