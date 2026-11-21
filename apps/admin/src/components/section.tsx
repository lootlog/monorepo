import type { ReactNode } from "react";

/** A titled block of a page, with an optional line explaining what it does. */
export function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="rounded-lg border border-border bg-card"
    >
      <div className="border-b border-border px-4 py-3 md:px-5">
        <h2 id={id} className="text-base font-semibold">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="px-4 py-4 md:px-5">{children}</div>
    </section>
  );
}
