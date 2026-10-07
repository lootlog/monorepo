import type { ReactNode } from "react";

type SectionHeadProps = {
  id: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function SectionHead({
  id,
  title,
  description,
  children,
}: SectionHeadProps) {
  return (
    <div className="landing-section-head">
      <h2 id={id} className="landing-heading-section max-w-2xl text-balance">
        {title}
      </h2>
      <div>
        <p className="landing-lead text-[var(--broadcast-text-muted)]">
          {description}
        </p>
        {children}
      </div>
    </div>
  );
}
