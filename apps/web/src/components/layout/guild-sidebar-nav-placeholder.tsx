import { Skeleton } from "@lootlog/ui/components/skeleton";
import * as m from "framer-motion/m";

const skeletonRows = [1, 2, 3, 4];

const bottomRows = [1, 2, 3];

export const GuildSidebarNavPlaceholder = () => {
  return (
    <div className="flex h-full w-full flex-1 flex-col gap-2 overflow-hidden bg-sidebar">
      <div className="mb-2 flex h-14 min-h-14 items-center border-b px-2">
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="space-y-2 px-2">
        {skeletonRows.map((i) => (
          <m.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: i * 0.05, ease: "easeOut" }}
          >
            <Skeleton className="h-10 w-full" />
          </m.div>
        ))}
      </div>
      <div className="px-2 pt-3">
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="space-y-2 px-2 pb-3">
        {bottomRows.map((i) => (
          <m.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.25,
              delay: (i + skeletonRows.length) * 0.05,
              ease: "easeOut",
            }}
          >
            <Skeleton className="h-10 w-full" />
          </m.div>
        ))}
      </div>
    </div>
  );
};
