import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  /** Controls beside the title, such as sharing the page. */
  actions?: ReactNode;
};

/** A section page's title and what it is for, on the page itself. */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="text-3xl font-semibold tracking-tight text-balance text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="max-w-3xl text-sm text-pretty text-muted-foreground md:text-[0.9375rem]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
    </header>
  );
}
