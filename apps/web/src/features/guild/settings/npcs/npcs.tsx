import { SearchInput } from "@/components/ui/search-input";
import {
  useGuildLootlogConfig,
  type LootlogConfigNpc,
} from "@/hooks/api/guilds/use-guild-lootlog-settings";
import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Card } from "@lootlog/ui/components/card";
import { NpcsPanelContent } from "@/features/guild/settings/npcs/components/npcs-panel-content";
import {
  SelectorPanel,
  SelectorPanelProvider,
  useSelectorPanel,
} from "@/components/selector-panel";
import { useTranslation } from "react-i18next";
import { NpcListItem } from "@/features/guild/settings/npcs/components/npc-list-item";
import { NpcType } from "@/hooks/api/game-data/use-npcs";

const NpcsHeader = () => {
  const { t } = useTranslation();

  return (
    <Card className="mx-3 mt-3 gap-4 border-border bg-card/60 p-4 backdrop-blur-sm shrink-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="p-2.5 rounded-xl bg-primary/10 shadow-inner shadow-primary/10">
          <Settings2 className="size-4 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold leading-tight">
            {t("settings.npcs.title")}
          </h2>
          <p className="text-xs text-muted-foreground leading-tight">
            {t("settings.npcs.description")}
          </p>
        </div>
      </div>
    </Card>
  );
};

const NpcsContent = () => {
  const { data: config } = useGuildLootlogConfig();
  const [searchValue, setSearchValue] = useState("");
  const { t } = useTranslation();
  const { selectedItem: selectedNpc } = useSelectorPanel<LootlogConfigNpc>();

  const filteredNpcs = config?.npcs?.filter((npc) => {
    const npcName = t(`npcType.${npc.npcType}`).toLowerCase();
    return (
      npcName.includes(searchValue.toLowerCase()) &&
      npc.npcType !== NpcType.COMMON
    );
  });

  return (
    <SelectorPanel<LootlogConfigNpc>
      header=<NpcsHeader />
      searchBar={
        <Card className="mx-3 mt-3 mb-3 shrink-0 border-border bg-card/40 p-3 backdrop-blur-sm">
          <SearchInput
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={t("settings.npcs.searchPlaceholder")}
            className="bg-input/30 h-9"
          />
        </Card>
      }
      listContent={
        <>
          {filteredNpcs?.map((npc, index) => (
            <NpcListItem key={npc.id} npc={npc} index={index} />
          ))}
        </>
      }
      panelContent={selectedNpc && <NpcsPanelContent />}
      emptyState={
        filteredNpcs?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Settings2 className="size-12 mb-4 opacity-30" />
            <p className="text-sm font-medium">
              {t("settings.npcs.emptyTitle")}
            </p>
            <p className="text-xs mt-1">
              {t("settings.npcs.emptyDescription")}
            </p>
          </div>
        )
      }
      mobileDrawerTitle={(npc) => <span>{t(`npcType.${npc.npcType}`)}</span>}
    />
  );
};

export const NpcSettings = () => {
  return (
    <SelectorPanelProvider<LootlogConfigNpc>>
      <NpcsContent />
    </SelectorPanelProvider>
  );
};
