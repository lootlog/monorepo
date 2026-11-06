import type { ReactNode } from "react";

/** A group of an infobox's rows under a small heading. */
export function InfoboxSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col border-t border-border/50 pt-2 pb-1 first:border-t-0">
      <h3 className="px-4 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      <dl className="flex flex-col">{children}</dl>
    </section>
  );
}
