import { upperFirst } from "es-toolkit";
import { Clock, Globe, MapPin, PackageX, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LootMetaItem } from "@/features/guild/loots-list/components/loots-list/loot-meta-item";
import { LiveFeedTime } from "./live-feed-time";

type Props = {
  world: string;
  location: string | undefined;
  occurredAt: string;
  now: number;
  players: number;
  hasLoot: boolean;
};

export function LiveFeedEventMeta({
  world,
  location,
  occurredAt,
  now,
  players,
  hasLoot,
}: Props) {
  const { t } = useTranslation();
  const place = [upperFirst(world), location].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <LootMetaItem
        icon={location ? MapPin : Globe}
        className="min-w-0"
        title={place}
      >
        <span className="truncate">{place}</span>
      </LootMetaItem>
      <LootMetaItem icon={Clock}>
        <LiveFeedTime occurredAt={occurredAt} now={now} />
      </LootMetaItem>
      {players > 0 && (
        <LootMetaItem
          icon={Users}
          label={t("statistics.feedPlayersCountLabel")}
        >
          {players}
        </LootMetaItem>
      )}
      {!hasLoot && (
        <LootMetaItem icon={PackageX}>
          {t("statistics.feedNoLoot")}
        </LootMetaItem>
      )}
    </div>
  );
}
