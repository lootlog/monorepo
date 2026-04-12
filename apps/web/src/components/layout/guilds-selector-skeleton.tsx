import { Skeleton } from "@lootlog/ui/components/skeleton";
import { motion } from "framer-motion";
import type { FC } from "react";

const SKELETON_COUNT = 3;
const skeletonItems = Array.from({ length: SKELETON_COUNT }, (_, i) => i);

export const GuildsSelectorSkeleton: FC = () => {
  return (
    <div className="flex flex-col items-center gap-2.5 px-[10px]">
      {skeletonItems.map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.05, ease: "easeOut" }}
        >
          <Skeleton className="size-11 rounded-lg" />
        </motion.div>
      ))}
    </div>
  );
};
