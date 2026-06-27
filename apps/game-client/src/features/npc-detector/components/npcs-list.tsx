import { ScrollArea } from "@/components/ui/scroll-area";
import { NpcListItem } from "@/features/npc-detector/components/npc-list-item";
import { AnimatePresence, motion } from "framer-motion";
import {
  type GameNpcWithLocation,
  useNpcDetectorStore,
} from "@/store/npc-detector.store";
import { useSettingsStore } from "@/store/settings.store";
import { type FC, useLayoutEffect, useRef } from "react";

type NpcsListProps = {
  npcs?: GameNpcWithLocation[];
};

export const NpcsList: FC<NpcsListProps> = ({ npcs }) => {
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const activeDetectionAnimations = useNpcDetectorStore(
    (state) => state.activeDetectionAnimations,
  );
  const latestDetectionAnimationCycle = useNpcDetectorStore(
    (state) => state.latestDetectionAnimationCycle,
  );
  const animationEffectsEnabled = useSettingsStore(
    (state) => state.animationEffectsEnabled,
  );

  useLayoutEffect(() => {
    if (latestDetectionAnimationCycle === 0) return;
    scrollViewportRef.current?.scrollTo({
      top: 0,
      behavior: animationEffectsEnabled ? "smooth" : "auto",
    });
  }, [animationEffectsEnabled, latestDetectionAnimationCycle]);

  return (
    <ScrollArea
      ref={scrollViewportRef}
      className="ll:w-full ll:box-border ll:h-full"
      type="hover"
    >
      {animationEffectsEnabled ? (
        <motion.div layout className="ll:flex ll:flex-col ll:gap-1 ll:pt-1">
          <AnimatePresence initial={false}>
            {npcs?.map((npc) => {
              return (
                <motion.div
                  key={npc.id}
                  layout="position"
                  className="ll:w-full"
                  exit={{ opacity: 0, y: -12, scale: 0.98 }}
                  transition={{
                    layout: {
                      type: "spring",
                      stiffness: 420,
                      damping: 32,
                      mass: 0.72,
                    },
                    opacity: { duration: 0.18 },
                  }}
                >
                  <NpcListItem
                    npc={npc}
                    detectionAnimationCycle={
                      activeDetectionAnimations[npc.id] ?? null
                    }
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="ll:flex ll:flex-col ll:gap-1 ll:pt-1">
          {npcs?.map((npc) => {
            return (
              <div key={npc.id} className="ll:w-full">
                <NpcListItem
                  npc={npc}
                  detectionAnimationCycle={
                    activeDetectionAnimations[npc.id] ?? null
                  }
                />
              </div>
            );
          })}
        </div>
      )}
    </ScrollArea>
  );
};
