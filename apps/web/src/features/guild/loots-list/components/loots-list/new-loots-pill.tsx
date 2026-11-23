import * as m from "framer-motion/m";
import { ArrowUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import { useChangeCount } from "@lootlog/ui/hooks/use-change-count";
import { cn } from "cn";
import { EASE_EMPHASIZED, MOTION_DURATION } from "@/lib/motion";

type NewLootsPillProps = {
  count: number;
  onShow: () => void;
};

export const NewLootsPill = ({ count, onShow }: NewLootsPillProps) => {
  const { t } = useTranslation();
  const countChange = useChangeCount(count);

  return (
    <m.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: MOTION_DURATION.medium, ease: EASE_EMPHASIZED }}
      className="pointer-events-auto"
    >
      <Button type="button" onClick={onShow}>
        <ArrowUp className="size-4" aria-hidden />
        <span>
          <span
            key={countChange}
            className={cn(
              "inline-block tabular-nums",
              countChange > 0 && "animate-bump motion-reduce:animate-none",
            )}
          >
            {count}
          </span>{" "}
          {t("loots.list.newLootsNoun", { count })}
        </span>
      </Button>
    </m.div>
  );
};
