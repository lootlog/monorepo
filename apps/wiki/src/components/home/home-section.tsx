import { useId, type ReactNode } from "react";

type HomeSectionProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function HomeSection({
  title,
  description,
  action,
  children,
}: HomeSectionProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-6">
        <div className="flex max-w-2xl flex-col gap-1.5">
          <h2
            id={headingId}
            className="text-2xl font-semibold tracking-[-0.02em] text-balance text-foreground md:text-3xl"
          >
            {title}
          </h2>
          {description ? (
            <p className="text-pretty text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
