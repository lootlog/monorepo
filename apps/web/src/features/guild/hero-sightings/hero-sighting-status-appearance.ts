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
  tileClassName: string;
  textClassName: string;
};

const SETTLED = {
  tileClassName: "bg-muted text-muted-foreground",
  textClassName: "text-muted-foreground",
};

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
