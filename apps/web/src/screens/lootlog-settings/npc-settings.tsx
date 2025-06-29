import {
  LootlogConfigNpc,
  useGuildLootlogConfig,
} from "@/hooks/api/use-guild-lootlog-settings";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";
import { Button } from "@lootlog/ui/components/button";
import { EllipsisVertical } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimatePresence, motion } from "framer-motion";
import { NpcSettingsPanelContent } from "@/screens/lootlog-settings/components/npc-settings-panel-content";
import { useTranslation } from "react-i18next";

export const NpcSettings = () => {
  const [selectedNpc, setSelectedNpc] = useState<LootlogConfigNpc | null>(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const { data: config } = useGuildLootlogConfig();
  const { t } = useTranslation();

  const prevSelectedNpc = useRef<LootlogConfigNpc | null>(null);

  useEffect(() => {
    if (prevSelectedNpc.current === null && selectedNpc !== null) {
      setShouldAnimate(true);
    } else {
      setShouldAnimate(false);
    }
    prevSelectedNpc.current = selectedNpc;
  }, [selectedNpc]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 pb-6">
        <div className="text-lg font-semibold">Ustawienia potworów i NPC</div>
        <div className="text-sm text-gray-500">
          Ustawienia npc np. jakie przedmioty ma zbierać dla jakiego potwora.
        </div>
      </div>
      <div
        className={cn("border-t grid grid-cols-[1fr] flex-1", {
          "grid-cols-[theme(width.64)_1fr]": selectedNpc,
        })}
      >
        <ScrollArea className="flex flex-col h-[calc(100vh-270px)]">
          {config?.npcs?.map((npc) => {
            const active = selectedNpc?.id === npc.id;

            return (
              <div
                key={npc.id}
                className={cn(
                  "border-b flex flex-row justify-between py-4 px-6 items-center hover:bg-[#181C25] cursor-pointer text-sm",
                  {
                    "bg-[#181C25]": active,
                  }
                )}
                onClick={() => setSelectedNpc(npc)}
              >
                <div className="flex flex-col justify-center">
                  <div className="font-semibold">
                    {t(`npcType.${npc.npcType}`)}
                  </div>
                  {!selectedNpc && (
                    <div className="text-xs font-semibold text-gray-500 mt-1">
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
                  )}
                </div>
                {!selectedNpc && (
                  <Button
                    className="size-8 rounded-full"
                    size="sm"
                    variant="secondary"
                  >
                    <EllipsisVertical />
                  </Button>
                )}
              </div>
            );
          })}
        </ScrollArea>
        <AnimatePresence>
          {selectedNpc &&
            (shouldAnimate ? (
              <motion.div
                className="border-l"
                initial={{ opacity: 0, x: 64 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                key={selectedNpc.id}
              >
                <NpcSettingsPanelContent
                  selectedNpc={selectedNpc}
                  setSelectedNpc={setSelectedNpc}
                />
              </motion.div>
            ) : (
              <div className="border-l">
                <NpcSettingsPanelContent
                  key={selectedNpc.id}
                  selectedNpc={selectedNpc}
                  setSelectedNpc={setSelectedNpc}
                />
              </div>
            ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
