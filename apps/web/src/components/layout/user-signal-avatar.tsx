import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { cn } from "cn";
import { User2 } from "lucide-react";

export type LiveSignal = "live" | "connecting" | "offline";

const SIGNAL_COLOR: Record<LiveSignal, string> = {
  live: "text-signal-live",
  connecting: "text-sidebar-foreground/45",
  offline: "text-signal-timer",
};

type UserSignalAvatarProps = {
  image?: string | null;
  signal: LiveSignal;
  /**
   * Sizes the avatar and sets `--signal-surface` to the background behind it, so
   * the status dot reads as cut out of it.
   */
  className?: string;
};

/**
 * The account avatar inside the Lootlog mark's open ring. The ring and the dot in
 * its gap carry the live-updates connection state.
 */
export const UserSignalAvatar = ({
  image,
  signal,
  className = "size-10 [--signal-surface:var(--sidebar)]",
}: UserSignalAvatarProps) => (
  <span
    className={cn(
      "relative grid shrink-0 place-items-center transition-colors duration-300 motion-reduce:transition-none",
      SIGNAL_COLOR[signal],
      className,
    )}
  >
    <svg
      aria-hidden="true"
      viewBox="0 0 40 40"
      className={cn(
        "absolute inset-0 size-full",
        signal === "connecting" &&
          "animate-[spin_1.4s_linear_infinite] motion-reduce:animate-none",
      )}
    >
      {/* The ring opens at 45°, where the status dot sits. */}
      <circle
        cx="20"
        cy="20"
        r="18.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        pathLength="100"
        strokeDasharray={signal === "connecting" ? "28 72" : "86 14"}
        transform="rotate(70.2 20 20)"
        className={cn(
          "transition-[stroke-dasharray,opacity] duration-300 motion-reduce:transition-none",
          signal === "live"
            ? "opacity-70 group-hover:opacity-100"
            : "opacity-90",
        )}
      />
    </svg>
    <Avatar className="size-[80%] rounded-full">
      <AvatarImage src={image ?? undefined} alt="" />
      <AvatarFallback>
        <User2 className="size-4 text-muted-foreground" />
      </AvatarFallback>
    </Avatar>
    {signal === "connecting" ? null : (
      <svg
        key={signal}
        aria-hidden="true"
        viewBox="0 0 40 40"
        className="absolute inset-0 size-full"
      >
        <circle
          cx="33.26"
          cy="33.26"
          r="3.25"
          fill="currentColor"
          stroke="var(--signal-surface)"
          strokeWidth="2"
          className="origin-center animate-pop-in [transform-box:fill-box] motion-reduce:animate-none"
        />
      </svg>
    )}
  </span>
);
