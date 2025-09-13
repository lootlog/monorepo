import {
  LootlogConfigNpc,
  useGuildLootlogConfig,
} from "@/hooks/api/use-guild-lootlog-settings";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";
import { Button } from "@lootlog/ui/components/button";
import { EllipsisVertical } from "lucide-react";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
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
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <div className="p-4 pb-4 flex-shrink-0">
        <div className="text-lg font-semibold">Ustawienia potworów i NPC</div>
        <div className="text-sm text-gray-500">
          Ustawienia npc np. jakie przedmioty ma zbierać dla jakiego potwora.
        </div>
      </div>
      <div
        className={cn(
          "border-t grid flex-1 min-h-0 transition-[grid-template-columns] overflow-hidden",
          // Base: single column; when selected on md+ show two columns.
          selectedNpc
            ? "grid-cols-1 md:grid-cols-[theme(width.64)_1fr]"
            : "grid-cols-1 md:grid-cols-[1fr]"
        )}
      >
        <ScrollArea
          className={cn("h-full min-h-0", selectedNpc && "hidden md:block")}
        >
          <div className="flex flex-col">
            {config?.npcs?.map((npc) => {
              const active = selectedNpc?.id === npc.id;

              return (
                <div
                  key={npc.id}
                  className={cn(
                    "border-b flex flex-row justify-between py-4 px-6 items-center hover:bg-secondary cursor-pointer text-sm",
                    {
                      "bg-secondary": active,
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
            );
          </div>
        </ScrollArea>
        <AnimatePresence mode="popLayout">
          {selectedNpc &&
            (shouldAnimate ? (
              <motion.div
                className={cn(
                  "border-l min-h-0 h-full overflow-hidden",
                  "md:border-l border-l-0"
                )}
                initial={{ opacity: 0, x: 32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ type: "spring", stiffness: 420, damping: 32 }}
                key={selectedNpc.id}
              >
                <NpcSettingsPanelContent
                  selectedNpc={selectedNpc}
                  setSelectedNpc={setSelectedNpc}
                />
              </motion.div>
            ) : (
              <div
                className={cn(
                  "border-l min-h-0 h-full overflow-hidden",
                  "md:border-l border-l-0"
                )}
                key={selectedNpc.id}
              >
                <NpcSettingsPanelContent
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
