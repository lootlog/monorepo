import type { ReactNode } from "react";

type CtaBandProps = {
  id: string;
  tone: "coral" | "amber";
  title: string;
  description: string;
  actions: ReactNode;
  emblem: ReactNode;
};

export function CtaBand({
  id,
  tone,
  title,
  description,
  actions,
  emblem,
}: CtaBandProps) {
  return (
    <section
      aria-labelledby={id}
      className={`landing-section landing-band landing-band-${tone} relative isolate overflow-hidden`}
    >
      <div aria-hidden="true" className="landing-cta-shapes">
        <span className="landing-shape" />
        <span className="landing-shape" />
        <span className="landing-shape" />
      </div>
      <div className="landing-container landing-cta-layout relative z-10">
        <div>
          <h2
            id={id}
            className="landing-heading-display max-w-4xl text-balance"
          >
            {title}
          </h2>
          <p className="landing-lead mt-6 font-medium">{description}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">{actions}</div>
        </div>
        <div aria-hidden="true" className="landing-cta-emblem">
          {emblem}
        </div>
      </div>
    </section>
  );
}
