import { Button } from "@lootlog/ui/components/button";
import { X } from "lucide-react";
import type { ReactNode } from "react";

type FilterChipButtonProps = {
  children: ReactNode;
  onRemove: () => void;
  removeLabel?: string;
};

export const FilterChipButton = ({
  children,
  onRemove,
  removeLabel,
}: FilterChipButtonProps) => (
  <Button
    type="button"
    variant="outline"
    size="sm"
    aria-label={removeLabel}
    title={removeLabel}
    className="h-7 max-w-full gap-1.5 border-primary/25 bg-primary/5 px-2 text-xs text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-foreground"
    onClick={onRemove}
  >
    <span className="truncate">{children}</span>
    <X className="size-3" aria-hidden="true" />
  </Button>
);
