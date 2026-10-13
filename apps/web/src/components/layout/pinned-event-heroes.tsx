import type { CSSProperties, FC } from "react";
import { npcIconUrl } from "@lootlog/domain/npc-icon";
import type { EventHeroNpc } from "@/features/guild/events/types/api";
import { cn } from "cn";

const MAX_VISIBLE_HEROES = 3;

// Each portrait pops in a beat after the previous one.
const POP_IN_STAGGER_MS = 70;

interface PinnedEventHeroesProps {
  heroNpcs: EventHeroNpc[];
  size?: "default" | "sm";
}

/**
 * The event's heroes as overlapping portraits; they fan out while the event
 * row is hovered.
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

  const visibleHeroes = heroesWithIcons.slice(0, MAX_VISIBLE_HEROES);
  const hiddenHeroCount = heroesWithIcons.length - visibleHeroes.length;

  const tileClassName = cn(
    "relative -ml-2.5 flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sidebar ring-2 ring-[var(--pinned-event-surface)] transition-[margin] duration-300 ease-emphasized first:ml-0 group-hover/event:-ml-1 group-hover/event:first:ml-0 motion-reduce:transition-none",
    size === "sm" ? "size-6" : "size-8",
  );

  return (
    <span aria-hidden="true" className="flex shrink-0 items-center">
      {visibleHeroes.map((heroNpc, index) => (
        <span
          key={heroNpc.id}
          className={cn(tileClassName, "animate-pop-in")}
          style={
            {
              animationDelay: `${index * POP_IN_STAGGER_MS}ms`,
            } satisfies CSSProperties
          }
        >
          {/* eslint-disable-next-line eslint-plugin-next/no-img-element */}
          <img
            src={npcIconUrl(heroNpc.npcIcon)}
            alt=""
            loading="lazy"
            className="size-full scale-125 object-contain"
          />
        </span>
      ))}
      {hiddenHeroCount > 0 && (
        <span
          className={cn(
            tileClassName,
            "animate-pop-in text-[0.6875rem] font-semibold text-muted-foreground tabular-nums",
          )}
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
