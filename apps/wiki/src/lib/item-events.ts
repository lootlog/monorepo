import {
  itemEventLabels,
  itemEventSlug,
  latestItemEvent,
} from "@lootlog/domain/item-events";
import { parseItemStats } from "@lootlog/ui/components/item-stat-utils";
import { t } from "@/i18n/messages";
import { isHeroTrackersEvent } from "@/lib/hero-trackers";

/** The events an item's stats name, as the game writes them. */
export const itemEvents = (stat: string) =>
  itemEventLabels(
    String(
      parseItemStats(stat).find(({ key }) => key === "etiquette")?.value ?? "",
    ),
  );

/** The event a slug names, as any of its items writes it. */
export const eventNameOf = (
  items: readonly { stat: string }[],
  eventSlug: string,
) =>
  itemEvents(items[0]?.stat ?? "").find(
    (label) => itemEventSlug(label) === eventSlug,
  );

/** The latest event an item belongs to; none for an item of no event. */
export const latestEventOf = (stat: string) =>
  latestItemEvent(itemEvents(stat));

/**
 * What an event is, under its name: Tropiciele Herosów for its editions,
 * and the monster that pictures it.
 */
export const eventSubtitle = (
  event: string,
  boss: { name: string } | null | undefined,
) => {
  const kind = isHeroTrackersEvent(event)
    ? t("npc.heroTrackers")
    : t("home.eventEyebrow");

  return boss ? `${kind} · ${boss.name}` : kind;
};
