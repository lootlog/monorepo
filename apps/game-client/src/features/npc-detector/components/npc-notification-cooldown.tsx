import { NPC_NOTIFICATION_COOLDOWN_MS } from "@/features/npc-detector/hooks/use-npc-list-lifecycle";
import { getStrokeDrainEasing } from "@/utils/notifications-and-detector/stroke-drain-easing";
import { useEffect, useRef, useState } from "react";

const RING_RADIUS = 11;

const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type NpcNotificationCooldownProps = {
  animationEffectsEnabled: boolean;
  endsAt: number;
};

const getRemainingMs = (endsAt: number) =>
  Math.min(NPC_NOTIFICATION_COOLDOWN_MS, Math.max(0, endsAt - Date.now()));

const getRingOffset = (remainingMs: number) =>
  RING_CIRCUMFERENCE * (1 - remainingMs / NPC_NOTIFICATION_COOLDOWN_MS);

/**
 * Owns the per-row countdown so the list and its rows stay untouched while
 * a cooldown runs: the label re-renders once per second boundary and the ring
 * is a single Web Animation instead of a state tick per frame.
 */
export const NpcNotificationCooldown = ({
  animationEffectsEnabled,
  endsAt,
}: NpcNotificationCooldownProps) => {
  const ringRef = useRef<SVGCircleElement>(null);
  const [remainingMs, setRemainingMs] = useState(() => getRemainingMs(endsAt));
  const secondsLeft = Math.max(1, Math.ceil(remainingMs / 1000));

  useEffect(() => {
    let timeoutId: number | undefined;

    const armNextSecond = (currentRemainingMs: number) => {
      if (currentRemainingMs <= 0) return;

      timeoutId = window.setTimeout(
        () => {
          const nextRemainingMs = getRemainingMs(endsAt);
          setRemainingMs(nextRemainingMs);
          armNextSecond(nextRemainingMs);
        },
        currentRemainingMs % 1000 || 1000,
      );
    };

    armNextSecond(getRemainingMs(endsAt));

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [endsAt]);

  useEffect(() => {
    const ring = ringRef.current;

    if (!animationEffectsEnabled || !ring) return;

    const currentRemainingMs = getRemainingMs(endsAt);
    const startOffset = String(getRingOffset(currentRemainingMs));
    ring.style.strokeDashoffset = startOffset;

    if (currentRemainingMs <= 0) return;

    const animation = ring.animate(
      [
        { strokeDashoffset: startOffset },
        { strokeDashoffset: String(RING_CIRCUMFERENCE) },
      ],
      {
        duration: currentRemainingMs,
        easing: getStrokeDrainEasing(currentRemainingMs),
        fill: "forwards",
      },
    );

    return () => {
      animation.cancel();
      ring.style.strokeDashoffset = "";
    };
  }, [animationEffectsEnabled, endsAt]);

  return (
    <>
      {animationEffectsEnabled ? (
        <svg
          className="ll:absolute ll:inset-0 ll:size-full ll:-rotate-90"
          viewBox="0 0 28 28"
          aria-hidden="true"
        >
          <circle
            cx="14"
            cy="14"
            r={RING_RADIUS}
            className="ll:stroke-white/15"
            fill="none"
            strokeWidth="2"
          />
          <circle
            ref={ringRef}
            cx="14"
            cy="14"
            r={RING_RADIUS}
            className="ll:stroke-white"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={getRingOffset(remainingMs)}
          />
        </svg>
      ) : null}
      <span className="ll:relative ll:text-[10px] ll:font-semibold ll:tabular-nums">
        {secondsLeft}
      </span>
    </>
  );
};
