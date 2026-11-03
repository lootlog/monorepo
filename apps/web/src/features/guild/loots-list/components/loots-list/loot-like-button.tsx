import { useState } from "react";
import {
  AnimatePresence,
  m,
  useReducedMotion,
  type Variants,
} from "framer-motion";
import { Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import { TextLink } from "@lootlog/ui/components/text-link";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { LikeBurst } from "@/features/guild/loots-list/components/loots-list/like-burst";
import { useLootLike } from "@/features/guild/loots-list/components/loots-list/use-loot-like";
import type { Loot } from "@/lib/loots/loot-types";

const HEART_SIZE = 14;

const NAMED_LIKERS = 10;

const COUNT_ROLL: Variants = {
  enter: (direction: number) => ({ y: `${100 * direction}%` }),
  center: { y: 0 },
  exit: (direction: number) => ({ y: `${-100 * direction}%` }),
};

type Pop = { key: number; liked: boolean };

export const LootLikeButton = ({ loot }: { loot: Loot }) => {
  const { t } = useTranslation();
  const { liked, likes, toggle } = useLootLike(loot);
  const reduceMotion = useReducedMotion();
  const [pop, setPop] = useState<Pop | null>(null);
  const [direction, setDirection] = useState(1);
  const count = likes.length;

  const names = likes
    .slice(0, NAMED_LIKERS)
    .map(({ name }) => name)
    .join(", ");

  const others = count - NAMED_LIKERS;

  const likers =
    count === 0
      ? t("loots.list.like")
      : others > 0
        ? t("loots.list.likedByOthers", { names, count: others })
        : t("loots.list.likedBy", { names });

  const onClick = () => {
    setPop((previous) => ({ key: (previous?.key ?? 0) + 1, liked: !liked }));
    setDirection(liked ? -1 : 1);
    toggle();
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <TextLink
            render={<button type="button" />}
            aria-pressed={liked}
            aria-label={t("loots.list.likeLabel", { count })}
            onClick={onClick}
            className={cn(
              "inline-flex h-8 items-center gap-1 tabular-nums hover:text-pink-500",
              count > 0 && "text-foreground",
              liked && "text-pink-500",
            )}
          />
        }
      >
        <span
          className="relative inline-flex shrink-0"
          style={{ width: HEART_SIZE, height: HEART_SIZE }}
        >
          {pop?.liked && !reduceMotion && (
            <LikeBurst key={`burst-${pop.key}`} size={HEART_SIZE} />
          )}
          {/* A new key replays the pop on every click, but not on mount. */}
          <m.span
            key={`heart-${pop?.key ?? 0}`}
            className="relative inline-flex size-full"
            initial={pop ? { scale: pop.liked ? 0 : 0.8 } : false}
            animate={{ scale: 1 }}
            transition={
              pop?.liked
                ? { type: "spring", stiffness: 400, damping: 12, delay: 0.06 }
                : { type: "spring", stiffness: 500, damping: 18 }
            }
          >
            <Heart
              aria-hidden
              className="size-full"
              fill={liked ? "currentColor" : "none"}
            />
          </m.span>
        </span>
        <span className="inline-grid overflow-hidden">
          <AnimatePresence initial={false} custom={direction}>
            <m.span
              key={count}
              custom={direction}
              variants={COUNT_ROLL}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: [0.3, 0.7, 0.3, 1] }}
              className="[grid-area:1/1]"
            >
              {count}
            </m.span>
          </AnimatePresence>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{likers}</TooltipContent>
    </Tooltip>
  );
};
