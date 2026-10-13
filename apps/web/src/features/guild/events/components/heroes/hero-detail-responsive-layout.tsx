import type { ReactNode } from "react";

interface HeroDetailResponsiveLayoutProps {
  maps: ReactNode;
  participants?: ReactNode;
  sidebar: ReactNode;
}

export const HeroDetailResponsiveLayout = ({
  maps,
  participants,
  sidebar,
}: HeroDetailResponsiveLayoutProps) => (
  <div
    className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]"
    data-hero-detail-layout
  >
    <div
      className="order-2 xl:col-start-1 xl:row-start-1"
      data-hero-detail-slot="maps"
    >
      {maps}
    </div>

    <div
      className="contents xl:col-start-2 xl:row-start-1 xl:block xl:space-y-3"
      data-hero-detail-slot="secondary"
    >
      {participants ? (
        <div
          className="order-1 xl:order-none"
          data-hero-detail-slot="participants"
        >
          {participants}
        </div>
      ) : null}
      <div
        className="order-3 space-y-3 xl:order-none"
        data-hero-detail-slot="sidebar"
      >
        {sidebar}
      </div>
    </div>
  </div>
);
