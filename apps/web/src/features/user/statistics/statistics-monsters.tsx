import type { UserKillAnalyticsResponseDtoOutput } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { StatisticsNpcTable } from "./statistics-npc-table";

export function StatisticsMonsters({
  data,
}: {
  data: UserKillAnalyticsResponseDtoOutput;
}) {
  const { t } = useTranslation();
  return (
    <>
      <SectionCard>
        <SectionCardHeader title={t("statistics.typeDistribution")} />
        <SectionCardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th>{t("statistics.type")}</th>
                  <th>{t("statistics.kills")}</th>
                  <th>{t("statistics.uniqueNpcs")}</th>
                  <th>{t("statistics.share")}</th>
                </tr>
              </thead>
              <tbody>
                {data.types.map((type) => (
                  <tr key={type.npcType} className="border-t border-border/50">
                    <th scope="row" className="py-2 font-normal">
                      {t(`npcType.${type.npcType}`)}
                    </th>
                    <td>{type.totalKills.toLocaleString("pl-PL")}</td>
                    <td>{type.uniqueNpcs}</td>
                    <td>
                      {type.share.toLocaleString("pl-PL", {
                        maximumFractionDigits: 1,
                      })}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCardContent>
      </SectionCard>
      <SectionCard>
        <SectionCardHeader
          title={t("statistics.ranking")}
          description={t("statistics.alignedComparison")}
        />
        <SectionCardContent>
          <StatisticsNpcTable npcs={data.npcs} />
        </SectionCardContent>
      </SectionCard>
      <SectionCard>
        <SectionCardHeader title={t("statistics.growth")} />
        <SectionCardContent>
          <StatisticsNpcTable npcs={data.npcGains} />
        </SectionCardContent>
      </SectionCard>
    </>
  );
}
