import { upperFirst } from "es-toolkit";
import { Clock, Globe, MapPin, PackageX, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MetaItem } from "@/components/common/meta-item";
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
      <MetaItem
        icon={location ? MapPin : Globe}
        className="min-w-0"
        title={place}
      >
        <span className="truncate">{place}</span>
      </MetaItem>
      <MetaItem icon={Clock}>
        <LiveFeedTime occurredAt={occurredAt} now={now} />
      </MetaItem>
      {players > 0 && (
        <MetaItem icon={Users} label={t("statistics.feedPlayersCountLabel")}>
          {players}
        </MetaItem>
      )}
      {!hasLoot && (
        <MetaItem icon={PackageX}>{t("statistics.feedNoLoot")}</MetaItem>
      )}
    </div>
  );
}
