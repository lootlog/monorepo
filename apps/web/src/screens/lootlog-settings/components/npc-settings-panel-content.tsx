import { ScrollArea } from "@/components/ui/scroll-area";
import { LootlogConfigNpc } from "@/hooks/api/use-guild-lootlog-settings";
import { NpcSettingsForm } from "@/screens/lootlog-settings/npc-settings-form";
import { ArrowLeft } from "lucide-react";
import { FC } from "react";
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
    <>
      <div className="p-4 border-b h-12 flex flex-row gap-4 items-center">
        <ArrowLeft
          className="cursor-pointer"
          onClick={() => setSelectedNpc(null)}
        />
        <div className="flex gap-4 items-center">
          <div className="font-semibold text-sm">
            {t(`npcType.${selectedNpc.npcType}`)}
          </div>
        </div>
      </div>
      <ScrollArea className="h-[calc(100vh-158px)]">
        <NpcSettingsForm npc={selectedNpc} />
      </ScrollArea>
    </>
  );
};
