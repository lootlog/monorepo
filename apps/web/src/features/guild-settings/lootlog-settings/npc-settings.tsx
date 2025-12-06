import { SearchInput } from "@/components/ui/search-input";
import {
  useGuildLootlogConfig,
  type LootlogConfigNpc,
} from "@/hooks/api/guilds/use-guild-lootlog-settings";
import { useState } from "react";
import { Settings2 } from "lucide-react";
import { NpcSettingsPanelContent } from "@/features/guild-settings/lootlog-settings/components/npc-settings-panel-content";
import {
  SelectorPanel,
  SelectorPanelProvider,
  useSelectorPanel,
} from "@/components/selector-panel";
import { useTranslation } from "react-i18next";
import { NpcListItem } from "@/features/guild-settings/lootlog-settings/components/npc-list-item";
import { NpcType } from "@/hooks/api/game-data/use-npcs";

const NpcSettingsHeader = () => (
  <div className="bg-background w-full flex items-center border-b px-3 shrink-0 py-4">
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="p-2 rounded-lg bg-primary/10">
        <Settings2 className="size-4 text-primary" />
      </div>
      <div>
        <h2 className="text-sm font-semibold leading-tight">
          Ustawienia potworów i NPC
        </h2>
        <p className="text-xs text-muted-foreground leading-tight">
          Jakie przedmioty ma zbierać dla jakiego potwora
        </p>
      </div>
    </div>
  </div>
);

const NpcSettingsContent = () => {
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
      header={<NpcSettingsHeader />}
      searchBar={
        <div className="px-3 py-2 border-b shrink-0 bg-background">
          <SearchInput
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Szukaj potwora..."
            className="bg-input/30 h-9"
          />
        </div>
      }
      listContent={
        <>
          {filteredNpcs?.map((npc, index) => (
            <NpcListItem key={npc.id} npc={npc} index={index} />
          ))}
        </>
      }
      panelContent={selectedNpc && <NpcSettingsPanelContent />}
      emptyState={
        filteredNpcs?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Settings2 className="size-12 mb-4 opacity-30" />
            <p className="text-sm font-medium">Nie znaleziono potworów</p>
            <p className="text-xs mt-1">
              Spróbuj zmienić kryteria wyszukiwania
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
      <NpcSettingsContent />
    </SelectorPanelProvider>
  );
};
