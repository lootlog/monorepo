import type { ReactNode } from "react";

type NoticeCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
  headingLevel?: "h1" | "h2";
  meta?: ReactNode;
  children?: ReactNode;
};

export const NoticeCard = ({
  icon,
  title,
  description,
  headingLevel: Heading = "h2",
  meta,
  children,
}: NoticeCardProps) => (
  <div className="flex min-h-0 flex-1 [align-items:safe_center] justify-center overflow-y-auto px-4 py-5 sm:px-6 md:py-8">
    <section className="flex w-full max-w-sm flex-col items-center rounded-xl border border-border bg-card px-4 py-5 text-center shadow-sm sm:px-7 sm:py-8">
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
