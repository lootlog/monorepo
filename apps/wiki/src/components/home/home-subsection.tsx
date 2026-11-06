import { useId, type ReactNode } from "react";

/** A group of shortcuts inside a home page section. */
export function HomeSubsection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3
        id={headingId}
        className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
      >
        {title}
      </h3>
      {children}
    </section>
  );
}
