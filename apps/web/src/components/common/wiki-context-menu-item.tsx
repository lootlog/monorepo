import { ContextMenuItem } from "@lootlog/ui/components/context-menu";
import { BookOpen } from "lucide-react";
import type { ReactNode } from "react";

/** A context menu entry that opens a catalog page on the wiki in a new tab. */
export const WikiContextMenuItem = ({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) => (
  <ContextMenuItem
    className="gap-2"
    render={<a href={href} target="_blank" rel="noopener noreferrer" />}
  >
    <BookOpen className="size-4 text-muted-foreground" />
    {children}
  </ContextMenuItem>
);
