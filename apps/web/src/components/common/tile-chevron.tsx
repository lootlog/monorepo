import { ChevronRight } from "lucide-react";

export const TileChevron = () => (
  <ChevronRight
    aria-hidden
    className="size-4 shrink-0 text-muted-foreground transition-[color,translate] duration-150 ease-emphasized group-hover/tile:translate-x-0.5 group-hover/tile:text-foreground group-focus-visible/tile:translate-x-0.5 group-focus-visible/tile:text-foreground motion-reduce:transition-none"
  />
);
