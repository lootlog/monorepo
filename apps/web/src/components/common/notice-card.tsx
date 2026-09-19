import type { ReactNode } from "react";

type NoticeCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
  /** `h1` when the notice is the whole page, `h2` inside a titled page. */
  headingLevel?: "h1" | "h2";
  meta?: ReactNode;
  children?: ReactNode;
};

/**
 * Centered card for a page that has one thing to say before it can show
 * anything else: pick a world, no access, not found.
 */
export const NoticeCard = ({
  icon,
  title,
  description,
  headingLevel: Heading = "h2",
  meta,
  children,
}: NoticeCardProps) => (
  <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-4 pb-8 pt-5 sm:px-6 md:[align-items:safe_center] md:py-8">
    <section className="flex w-full max-w-sm animate-content-in flex-col items-center rounded-2xl border border-border bg-card px-4 py-5 text-center shadow-sm sm:px-7 sm:py-8">
      <div className="mb-4 flex size-14 items-center justify-center rounded-xl border border-border bg-background">
        {icon}
      </div>
      <Heading className="text-base font-semibold text-foreground">
        {title}
      </Heading>
      <p className="mt-1 max-w-xs text-sm leading-5 text-muted-foreground">
        {description}
      </p>
      {meta}
      {children ? <div className="mt-5 w-full">{children}</div> : null}
    </section>
  </div>
);
