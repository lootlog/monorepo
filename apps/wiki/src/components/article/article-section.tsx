import type { ReactNode } from "react";

type ArticleSectionProps = {
  /** The heading's id, which links to the section. */
  id: string;
  title: string;
  /** A count beside the title, such as how many drops a monster has. */
  count?: number;
  /** A control beside the title, such as a link to the whole list. */
  action?: ReactNode;
  description?: string;
  children: ReactNode;
};

/** One part of an article under a ruled heading. */
export function ArticleSection({
  id,
  title,
  count,
  action,
  description,
  children,
}: ArticleSectionProps) {
  return (
    <section aria-labelledby={id} className="flex scroll-mt-20 flex-col gap-4">
      <div className="flex flex-col gap-1.5 border-b border-border/60 pb-2.5">
        <div className="flex min-h-8 items-center justify-between gap-4">
          <h2
            id={id}
            className="flex items-baseline gap-2 text-lg font-semibold tracking-tight text-foreground"
          >
            {title}
            {count === undefined ? null : (
              <span className="text-sm font-medium text-muted-foreground tabular-nums">
                {count}
              </span>
            )}
          </h2>
          {action}
        </div>
        {description ? (
          <p className="text-sm text-pretty text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
