import { useId, type ReactNode } from "react";

type HomeSectionProps = {
  title: string;
  description?: string;
  /** A link to the full list, drawn beside the title. */
  action?: ReactNode;
  children: ReactNode;
};

/** One topic of the home page under its heading. */
export function HomeSection({
  title,
  description,
  action,
  children,
}: HomeSectionProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-1.5">
          <h2
            id={headingId}
            className="text-xl font-semibold tracking-tight text-balance text-foreground md:text-2xl"
          >
            {title}
          </h2>
          {description ? (
            <p className="text-sm text-pretty text-muted-foreground md:text-[0.9375rem]">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
