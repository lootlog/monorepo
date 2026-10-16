import type { ReactNode } from "react";
import { StatsSectionColumns } from "@/components/common/stats-section-columns";

interface HeroDetailResponsiveLayoutProps {
  maps: ReactNode;
  participants?: ReactNode;
  sidebar: ReactNode;
}

/**
 * The hero's maps beside who takes part and the hero's ranking, kills and
 * loots. Narrower pages stack participants first, so a player finds
 * themselves before the long list of maps.
 */
export const HeroDetailResponsiveLayout = ({
  maps,
  participants,
  sidebar,
}: HeroDetailResponsiveLayoutProps) => (
  <StatsSectionColumns className="xl:grid-cols-[minmax(0,1fr)_440px]">
    <div className="min-w-0 max-xl:order-2">{maps}</div>
    <div className="min-w-0 max-xl:contents">
      {participants && (
        <div className="min-w-0 max-xl:order-1">{participants}</div>
      )}
      <div className="min-w-0 max-xl:order-3">{sidebar}</div>
    </div>
  </StatsSectionColumns>
);
