import { cn } from "cn";
import type { HeroSightingStatus } from "./hero-sighting-status";
import { HERO_SIGHTING_STATUS_APPEARANCE } from "./hero-sighting-status-appearance";

type HeroSightingStatusIconProps = {
  status: HeroSightingStatus;
  /** The tile's size and radius; the default leads a board tile. */
  className?: string;
};

/** A tile in the status colour, so the board reads at a glance. */
export const HeroSightingStatusIcon = ({
  status,
  className = "size-10 rounded-lg",
}: HeroSightingStatusIconProps) => {
  const { icon: Icon, tileClassName } = HERO_SIGHTING_STATUS_APPEARANCE[status];

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex shrink-0 items-center justify-center",
        tileClassName,
        className,
      )}
    >
      <Icon className="size-[45%]" />
      {status === "ROAMING" && (
        // The hero is out there now.
        <span className="absolute -top-0.5 -right-0.5 flex size-2.5">
          <span className="absolute inset-0 animate-ping rounded-full bg-signal-live opacity-60 motion-reduce:hidden" />
          <span className="relative size-2.5 rounded-full border-2 border-background bg-signal-live" />
        </span>
      )}
    </span>
  );
};
