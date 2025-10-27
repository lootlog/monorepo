import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import type { LootlogConfigNpc } from "@/hooks/api/guilds/use-guild-lootlog-settings";
import { NpcSettingsForm } from "@/features/lootlog-settings/npc-settings-form";
import { ArrowLeft } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

export type NpcSettingsPanelContentProps = {
  selectedNpc: LootlogConfigNpc;
  setSelectedNpc: (npc: LootlogConfigNpc | null) => void;
};

export const NpcSettingsPanelContent: FC<NpcSettingsPanelContentProps> = ({
  selectedNpc,
  setSelectedNpc,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <div className="p-4 border-b flex flex-row gap-4 items-center min-h-12 flex-shrink-0">
        <ArrowLeft
          className="cursor-pointer"
          onClick={() => setSelectedNpc(null)}
        />
        <div className="flex gap-4 items-center">
          <div className="font-semibold text-sm truncate">
            {t(`npcType.${selectedNpc.npcType}`)}
          </div>
        </div>
      </div>
      <ScrollArea className="flex-1 min-h-0 overflow-hidden">
        <NpcSettingsForm npc={selectedNpc} />
      </ScrollArea>
    </div>
  );
};
