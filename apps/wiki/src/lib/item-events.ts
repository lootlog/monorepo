import {
  itemEventLabels,
  itemEventSlug,
  latestItemEvent,
} from "@lootlog/domain/item-events";
import { itemStatValue } from "@lootlog/domain/item-stat";
import { t } from "@/i18n/messages";
import { isHeroTrackersEvent } from "@/lib/hero-trackers";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";

export const WIKI_EVENTS_QUERY = { gameVersion: WIKI_GAME_VERSION } as const;

export const itemEvents = (stat: string) =>
  itemEventLabels(itemStatValue(stat, "etiquette") ?? "");

export const eventNameOf = (
  items: readonly { stat: string }[],
  eventSlug: string,
) =>
  itemEvents(items[0]?.stat ?? "").find(
    (label) => itemEventSlug(label) === eventSlug,
  );

export const latestEventOf = (stat: string) =>
  latestItemEvent(itemEvents(stat));

export const eventSubtitle = (
  event: string,
  boss: { name: string } | null | undefined,
) => {
  const kind = isHeroTrackersEvent(event)
    ? t("npc.heroTrackers")
    : t("home.eventEyebrow");

  return boss ? `${kind} · ${boss.name}` : kind;
};
