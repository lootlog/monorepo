import { useGuildLootlogConfig } from "@/hooks/api/use-guild-lootlog-settings";
import { useTranslation } from "react-i18next";
import { cn } from "@/utils/cn";
import { LootlogSettingsForm } from "@/screens/lootlog-settings/lootlog-settings-form";

export const LootlogSettings = () => {
  const { data: config } = useGuildLootlogConfig();
  const { t } = useTranslation();

  return (
    <div className="h-full">
      <div className="p-4 pb-6">
        <div className="text-lg font-semibold">Lootlog</div>
        <div className="text-sm text-gray-500">
          Ustawienia lootloga np. jakie przedmioty ma zbierać dla jakiego
          potwora
        </div>
      </div>
      <div className="flex-1 border-t h-full">
        {config?.npcs.map((npc) => {
          return (
            <div
              key={npc.id}
              className="border-b flex flex-row justify-between py-4 px-4 items-center"
            >
              <div>
                <div className="font-semibold">
                  {t(`npcType.${npc.npcType}`)}
                </div>
                <div className="text-xs font-semibold text-gray-500 mt-2">
                  <span className={cn("text-white")}>
                    {npc.allowedRarities.map((rarity, i) => {
                      return (
                        <span
                          key={rarity}
                          className={cn({
                            "text-amber-700": rarity === "LEGENDARY",
                            "text-blue-500": rarity === "HEROIC",
                            "text-amber-300": rarity === "UNIQUE",
                            "text-gray-500": rarity === "COMMON",
                            "text-pink-700": rarity === "UPGRADED",
                          })}
                        >
                          {t(`itemRarity.${rarity}`)}
                          {npc.allowedRarities.length - 1 > i ? ", " : ""}
                        </span>
                      );
                    })}
                  </span>
                </div>
              </div>
              <div>
                <LootlogSettingsForm npc={npc} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
