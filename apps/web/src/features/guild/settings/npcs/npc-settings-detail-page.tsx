import { MetaItem } from "@/components/common/meta-item";
import { EmptyState } from "@/components/common/empty-state";
import { NPC_RARITY_CONFIG } from "@/features/guild/settings/npcs/npc-rarity-config";
import { NpcsForm } from "@/features/guild/settings/npcs/npcs-form";
import { useLootlogConfigControllerGetLootlogConfig } from "@lootlog/client/main";
import { useParams } from "@tanstack/react-router";
import { Gem, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SettingsDetailPage } from "../components/settings-detail-page";
import { NpcRarityMarks } from "./npc-rarity-marks";

export const NpcSettingsDetailPage = () => {
  const { t } = useTranslation();

  const { guildId, npcId } = useParams({
    from: "/_authenticated/$guildId/settings/npcs_/$npcId",
  });

  const { data: config } = useLootlogConfigControllerGetLootlogConfig({
    guildId,
  });

  const npc = config?.npcs?.find((item) => String(item.id) === npcId) ?? null;

  if (config && !npc) {
    return (
      <EmptyState
        icon={Settings2}
        title={t("settings.npcs.npcNotFound")}
        description={t("settings.npcs.npcNotFoundDescription")}
        className="h-full"
      />
    );
  }

  if (!npc) {
    return null;
  }

  const enabledRarities = NPC_RARITY_CONFIG.filter((rarity) =>
    npc.allowedRarities.includes(rarity.key),
  );

  return (
    <SettingsDetailPage
      name={t(`npcType.${npc.npcType}`)}
      meta={
        <>
          <MetaItem icon={Gem}>
            {enabledRarities.length > 0
              ? t("settings.npcs.rarityCountCompact", {
                  count: enabledRarities.length,
                  total: NPC_RARITY_CONFIG.length,
                })
              : t("settings.npcs.noRarities")}
          </MetaItem>
          {enabledRarities.length > 0 && (
            <span className="flex items-center gap-1">
              <NpcRarityMarks rarities={enabledRarities} side="bottom" />
            </span>
          )}
        </>
      }
    >
      <NpcsForm npc={npc} />
    </SettingsDetailPage>
  );
};
