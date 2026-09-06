import type { UserKillAnalyticsResponseDtoOutput } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";

export function StatisticsNpcTable({
  npcs,
}: {
  npcs: UserKillAnalyticsResponseDtoOutput["npcs"];
}) {
  const { t } = useTranslation();
  if (!npcs.length)
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {t("statistics.noData")}
      </p>
    );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead>
          <tr>
            {[
              "npc",
              "world",
              "kills",
              "current",
              "previous",
              "change",
              "share",
              "bestDay",
            ].map((key) => (
              <th
                key={key}
                scope="col"
                className="pb-2 pr-3 text-xs font-medium text-muted-foreground"
              >
                {t(`statistics.${key}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {npcs.map((npc) => (
            <tr
              key={`${npc.world}:${npc.npcId}`}
              className="border-t border-border/50"
            >
              <th scope="row" className="py-3 pr-3 font-medium">
                {npc.npcName}
                <span className="block text-xs font-normal text-muted-foreground">
                  {npc.npcLvl}
                  {npc.npcProf} · {t(`npcType.${npc.npcType}`)}
                </span>
              </th>
              <td className="pr-3">{npc.world}</td>
              <td>{npc.totalKills.toLocaleString("pl-PL")}</td>
              <td>{npc.comparisonKills.toLocaleString("pl-PL")}</td>
              <td>{npc.previousKills.toLocaleString("pl-PL")}</td>
              <td className="pr-3">
                {npc.deltaKills.toLocaleString("pl-PL")}
                <span className="block text-xs text-muted-foreground">
                  {npc.deltaPercent === null
                    ? "—"
                    : `${npc.deltaPercent.toLocaleString("pl-PL", { maximumFractionDigits: 1 })}%`}
                </span>
              </td>
              <td>
                {npc.share.toLocaleString("pl-PL", {
                  maximumFractionDigits: 1,
                })}
                %
              </td>
              <td>
                {npc.bestDay?.date ?? "—"}
                <span className="block text-xs text-muted-foreground">
                  {npc.bestDay &&
                    t("statistics.count", { count: npc.bestDay.kills })}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
