import {
  CircleDashed,
  CircleSlash,
  Footprints,
  Hourglass,
  Skull,
  type LucideIcon,
} from "lucide-react";
import type { HeroSightingStatus } from "./hero-sighting-status";

type HeroSightingStatusAppearance = {
  icon: LucideIcon;
  /** The fill and icon colour of the status tile. */
  tileClassName: string;
  /** The colour of the status named in text. */
  textClassName: string;
};

const SETTLED = {
  tileClassName: "bg-muted text-muted-foreground",
  textClassName: "text-muted-foreground",
};

/** Live signals keep their colour; heroes no longer to act on go quiet. */
export const HERO_SIGHTING_STATUS_APPEARANCE = {
  ROAMING: {
    icon: Footprints,
    tileClassName: "bg-signal-live/12 text-signal-live",
    textClassName: "text-signal-live",
  },
  SPAWNING: {
    icon: Hourglass,
    tileClassName: "bg-signal-timer/12 text-signal-timer",
    textClassName: "text-signal-timer",
  },
  STALE: { icon: CircleDashed, ...SETTLED },
  PROBABLY_KILLED: { icon: Skull, ...SETTLED },
  KILLED: { icon: Skull, ...SETTLED },
  CLOSED: { icon: CircleSlash, ...SETTLED },
} satisfies Record<HeroSightingStatus, HeroSightingStatusAppearance>;
