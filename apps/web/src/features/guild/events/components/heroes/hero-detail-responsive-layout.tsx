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
    className="grid grid-cols-1 gap-3 lg:grid-cols-3"
    data-hero-detail-layout
  >
    <div
      className="order-2 lg:col-span-2 lg:col-start-1 lg:row-start-1"
      data-hero-detail-slot="maps"
    >
      {maps}
    </div>

    <div
      className="contents lg:col-start-3 lg:row-start-1 lg:block lg:space-y-3"
      data-hero-detail-slot="secondary"
    >
      {participants ? (
        <div
          className="order-1 lg:order-none"
          data-hero-detail-slot="participants"
        >
          {participants}
        </div>
      ) : null}
      <div
        className="order-3 space-y-3 lg:order-none"
        data-hero-detail-slot="sidebar"
      >
        {sidebar}
      </div>
    </div>
  </div>
);
