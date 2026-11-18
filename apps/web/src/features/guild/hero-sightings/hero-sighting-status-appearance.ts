import {
  CircleDashed,
  CircleSlash,
  Footprints,
  Hourglass,
  Skull,
  Trash2,
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

/**
 * A spawn to camp keeps its colour. A roaming hero is a record of where it
 * was found, not a call to run there, so it goes quiet like the heroes no
 * longer to act on.
 */
export const HERO_SIGHTING_STATUS_APPEARANCE = {
  SPAWNING: {
    icon: Hourglass,
    tileClassName: "bg-signal-timer/12 text-signal-timer",
    textClassName: "text-signal-timer",
  },
  ROAMING: { icon: Footprints, ...SETTLED },
  STALE: { icon: CircleDashed, ...SETTLED },
  PROBABLY_KILLED: { icon: Skull, ...SETTLED },
  KILLED: { icon: Skull, ...SETTLED },
  WITHDRAWN: { icon: Trash2, ...SETTLED },
  CLOSED: { icon: CircleSlash, ...SETTLED },
} satisfies Record<HeroSightingStatus, HeroSightingStatusAppearance>;
