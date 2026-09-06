import { useId } from "react";
import { useTranslation } from "react-i18next";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { PlayerSpriteTile } from "@/components/tiles/player-sprite-tile";
import type { Loot } from "@/lib/loots/loot-types";
import { getShortnameByProf } from "@lootlog/domain/profession";

type LootMapPlayersProps = {
  loot: Pick<Loot, "source" | "mapPlayersSnapshot"> & {
    items: Pick<Loot["items"][number], "rarity">[];
    npcs: Pick<Loot["npcs"][number], "wt" | "type">[];
  };
};

export const LootMapPlayers = ({ loot }: LootMapPlayersProps) => {
  const { t } = useTranslation();
  const titleId = useId();
  const players = loot.mapPlayersSnapshot;
  const primaryNpc = loot.npcs.reduce<(typeof loot.npcs)[number] | undefined>(
    (primary, npc) =>
      !primary || (npc.wt ?? 0) > (primary.wt ?? 0) ? npc : primary,
    undefined,
  );
  if (
    !players?.length &&
    (loot.source !== "FIGHT" ||
      primaryNpc?.type !== "ELITE2" ||
      !loot.items.some((item) => item.rarity === "LEGENDARY"))
  ) {
    return null;
  }

  return (
    <section aria-labelledby={titleId} className="border-b border-border">
      <SectionCardHeader
        id={titleId}
        title={
          players?.length
            ? t("loots.details.mapPlayers.titleWithCount", {
                count: players.length,
              })
            : t("loots.details.mapPlayers.title")
        }
      />
      {players?.length ? (
        <ul className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2">
          {players.map((player) => (
            <li
              key={`${player.accountId}:${player.characterId}`}
              className="flex min-w-0 items-center gap-2"
            >
              {player.icon && (
                <span aria-hidden="true" className="shrink-0">
                  <PlayerSpriteTile
                    icon={player.icon}
                    wrapperClassName="relative"
                    tileClassName="cursor-default"
                  />
                </span>
              )}
              <div className="min-w-0">
                <p className="break-words text-sm font-medium">{player.name}</p>
                {player.prof && (
                  <p className="text-xs text-muted-foreground">
                    {t(`professions.${getShortnameByProf(player.prof)}`)}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="p-3 text-sm text-muted-foreground">
          {t("loots.details.mapPlayers.unavailable")}
        </p>
      )}
    </section>
  );
};
