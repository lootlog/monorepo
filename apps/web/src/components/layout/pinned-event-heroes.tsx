import type { CSSProperties, FC } from "react";
import { npcIconUrl } from "@lootlog/domain/npc-icon";
import type { EventHeroNpc } from "@/features/guild/events/types/api";
import { cn } from "cn";

// Up to this many heroes are all shown; a larger roster keeps one slot fewer
// and counts the rest, so the stack never grows past four slots.
const MAX_SLOTS = 4;

// Each portrait pops in a beat after the previous one.
const POP_IN_STAGGER_MS = 70;

interface PinnedEventHeroesProps {
  heroNpcs: EventHeroNpc[];
  size?: "default" | "sm";
}

/**
 * The event's heroes standing in an overlapping row; they step apart while
 * the event row is hovered.
 */
export const PinnedEventHeroes: FC<PinnedEventHeroesProps> = ({
  heroNpcs,
  size = "default",
}) => {
  const heroesWithIcons = heroNpcs.filter(
    (heroNpc): heroNpc is EventHeroNpc & { npcIcon: string } =>
      Boolean(heroNpc.npcIcon),
  );

  if (heroesWithIcons.length === 0) return null;

  const visibleHeroes = heroesWithIcons.slice(
    0,
    heroesWithIcons.length > MAX_SLOTS ? MAX_SLOTS - 1 : MAX_SLOTS,
  );

  const hiddenHeroCount = heroesWithIcons.length - visibleHeroes.length;

  const slotClassName = cn(
    "shrink-0 transition-[margin] duration-300 ease-emphasized motion-reduce:transition-none",
    size === "sm"
      ? "-ml-4 first:ml-0 group-hover/event:-ml-1.5 group-hover/event:first:ml-0"
      : "-ml-5 first:ml-0 group-hover/event:-ml-2 group-hover/event:first:ml-0",
  );

  return (
    <span aria-hidden="true" className="flex shrink-0 items-end">
      {visibleHeroes.map((heroNpc, index) => (
        // eslint-disable-next-line eslint-plugin-next/no-img-element
        <img
          key={heroNpc.id}
          src={npcIconUrl(heroNpc.npcIcon)}
          alt=""
          loading="lazy"
          // A soft shadow cast to the left keeps overlapping sprites apart.
          className={cn(
            slotClassName,
            "animate-pop-in object-contain object-bottom drop-shadow-[-2px_1px_2px_rgb(0_0_0/0.6)]",
            // Sprites are mostly transparent margin, so they may spill past the row.
            size === "sm" ? "-my-1 size-8" : "-my-2 size-10",
          )}
          style={
            {
              animationDelay: `${index * POP_IN_STAGGER_MS}ms`,
            } satisfies CSSProperties
          }
        />
      ))}
      {hiddenHeroCount > 0 && (
        <span
          className="ml-1.5 animate-pop-in self-center text-xs font-semibold text-muted-foreground tabular-nums"
          style={
            {
              animationDelay: `${visibleHeroes.length * POP_IN_STAGGER_MS}ms`,
            } satisfies CSSProperties
          }
        >
          +{hiddenHeroCount}
        </span>
      )}
    </span>
  );
};
