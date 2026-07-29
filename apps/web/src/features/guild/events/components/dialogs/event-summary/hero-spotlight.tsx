import { motion, useReducedMotion } from "framer-motion";
import { Badge } from "@lootlog/ui/components/badge";
import type { EventWrappedHero } from "../../../types/api";
import { MetricCard } from "./metric-card";
import { formatMetric } from "./utils";

interface HeroSpotlightProps {
  hero: EventWrappedHero;
  title: string;
  killsLabel: string;
  pointsLabel: string;
  coverageLabel: string;
}

export const HeroSpotlight = ({
  hero,
  title,
  killsLabel,
  pointsLabel,
  coverageLabel,
}: HeroSpotlightProps) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={
        prefersReducedMotion ? false : { opacity: 0, y: 26, scale: 0.985 }
      }
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={
        prefersReducedMotion
          ? { duration: 0.18 }
          : {
              duration: 0.34,
              delay: 0.06,
              ease: [0.22, 1, 0.36, 1],
            }
      }
      className="relative overflow-hidden rounded-[28px] border border-border/70 bg-background p-4"
    >
      {!prefersReducedMotion ? (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)]"
          animate={{ x: ["0%", "320%"] }}
          transition={{
            duration: 2.6,
            repeat: Infinity,
            repeatDelay: 2.4,
            ease: "easeInOut",
          }}
        />
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            {title}
          </p>
          <h4 className="mt-2 text-lg font-semibold leading-tight">
            {hero.npcName}
          </h4>
        </div>
        <Badge variant="outline" className="bg-background text-xs">
          {hero.mapCount}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MetricCard
          eyebrow={killsLabel}
          value={formatMetric(hero.totalKills)}
          caption=""
        />
        <MetricCard
          eyebrow={pointsLabel}
          value={formatMetric(hero.totalPoints)}
          caption=""
          tone="warm"
        />
        <MetricCard
          eyebrow={coverageLabel}
          value={`${formatMetric(hero.coveragePercentage)}%`}
          caption=""
          tone="emerald"
        />
      </div>
    </motion.div>
  );
};
