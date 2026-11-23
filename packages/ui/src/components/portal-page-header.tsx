import type { ReactNode } from "react";

type PortalPageHeaderProps = {
  title: string;
  description?: ReactNode;
  eyebrow?: ReactNode;
  media?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
};

export function PortalPageHeader({
  title,
  description,
  eyebrow,
  media,
  actions,
  children,
}: PortalPageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        {media}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {eyebrow ? <div className="text-sm">{eyebrow}</div> : null}
          <h1 className="text-[clamp(1.75rem,2.6vw,2.25rem)] leading-[1.15] font-semibold tracking-[-0.03em] text-balance text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="max-w-3xl text-sm text-pretty text-muted-foreground md:text-[0.9375rem]">
              {description}
            </p>
          ) : null}
          {children}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
