import { startTransition, useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "framer-motion";
import { useTranslation } from "react-i18next";
import { Badge } from "@lootlog/ui/components/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { ArrowLeft, ArrowRight, Sparkles, Trophy } from "lucide-react";
import { cn } from "@/utils/cn";
import {
  useEventWrapped,
  type EventWrapped,
  type EventWrappedHero,
  type EventWrappedLeader,
  type EventWrappedRarityTotals,
} from "../../hooks/queries/use-event-wrapped";
import { formatDurationHuman } from "../../utils";

interface EventSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guildId: string;
  eventId: string;
  eventName: string;
}

type WrappedStep = {
  id: string;
  label: string;
  title: string;
  description: string;
  content: React.ReactNode;
};

type MetricTone = "default" | "warm" | "danger" | "emerald" | "blue" | "yellow";

type StepMotionPreset = {
  initial: Record<string, number | string>;
  animate: Record<string, number | string>;
  exit: Record<string, number | string>;
};

const formatMetric = (value: number): string => {
  return new Intl.NumberFormat("pl-PL", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
};

const formatHourLabel = (hour: number | null): string => {
  if (hour === null) {
    return "--:--";
  }

  return `${hour.toString().padStart(2, "0")}:00`;
};

const AnimatedPanel = ({
  children,
  className,
  delay = 0,
  shimmer = false,
}: {
  children: React.ReactNode;
  className: string;
  delay?: number;
  shimmer?: boolean;
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={
        prefersReducedMotion ? false : { opacity: 0, y: 24, scale: 0.985 }
      }
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={
        prefersReducedMotion
          ? { duration: 0.18 }
          : {
              duration: 0.3,
              delay,
              ease: [0.22, 1, 0.36, 1],
            }
      }
      className={cn("relative overflow-hidden", className)}
    >
      {shimmer && !prefersReducedMotion ? (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent)]"
          animate={{ x: ["-10%", "340%"] }}
          transition={{
            duration: 2.8,
            repeat: Infinity,
            repeatDelay: 1.8,
            ease: "easeInOut",
            delay,
          }}
        />
      ) : null}
      {children}
    </motion.div>
  );
};

const MetricCard = ({
  eyebrow,
  value,
  caption,
  tone = "default",
}: {
  eyebrow: string;
  value: string;
  caption: string;
  tone?: MetricTone;
}) => {
  return (
    <AnimatedPanel
      delay={0.05}
      className={cn(
        "rounded-3xl border px-4 py-4 backdrop-blur-sm transition-colors",
        tone === "default" && "border-border/70 bg-background/70",
        tone === "warm" && "border-amber-400/30 bg-amber-500/10",
        tone === "danger" && "border-rose-500/30 bg-rose-500/10",
        tone === "emerald" && "border-emerald-500/30 bg-emerald-500/10",
        tone === "blue" &&
          "border-blue-500/45 bg-blue-500/16 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        tone === "yellow" && "border-yellow-500/30 bg-yellow-500/10",
      )}
    >
      <div className={cn("relative z-[1]")}>
        <p
          className={cn(
            "text-[10px] uppercase tracking-[0.24em] text-muted-foreground",
            tone === "blue" && "text-blue-800 dark:text-blue-200/90",
          )}
        >
          {eyebrow}
        </p>
        <p
          className={cn(
            "mt-3 text-2xl font-semibold leading-none sm:text-3xl",
            tone === "blue" && "text-blue-950 dark:text-blue-50",
          )}
        >
          {value}
        </p>
        <p
          className={cn(
            "mt-2 text-sm text-muted-foreground",
            tone === "blue" && "text-blue-900/80 dark:text-blue-100/75",
          )}
        >
          {caption}
        </p>
      </div>
    </AnimatedPanel>
  );
};

const LeaderCard = ({
  title,
  leader,
  suffix,
  extra,
  value,
}: {
  title: string;
  leader: EventWrappedLeader | null;
  suffix?: string;
  extra?: string;
  value?: string;
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={
        prefersReducedMotion ? false : { opacity: 0, y: 20, scale: 0.98 }
      }
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={
        prefersReducedMotion
          ? { duration: 0.18 }
          : {
              duration: 0.28,
              delay: 0.08,
              ease: [0.22, 1, 0.36, 1],
            }
      }
      className="rounded-3xl border border-border/70 bg-background/70 px-4 py-4 backdrop-blur-sm"
    >
      <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
        {title}
      </p>
      {leader ? (
        <>
          <p className="mt-3 text-lg font-semibold leading-tight">
            {leader.name}
          </p>
          <p className="mt-2 text-2xl font-semibold leading-none">
            {value ?? formatMetric(leader.primaryValue)}
            {suffix ? (
              <span className="ml-1 text-base text-muted-foreground">
                {suffix}
              </span>
            ) : null}
          </p>
          {extra ? (
            <p className="mt-2 text-sm text-muted-foreground">{extra}</p>
          ) : null}
        </>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">-</p>
      )}
    </motion.div>
  );
};

const StepDots = ({
  total,
  current,
  onSelect,
  getAriaLabel,
}: {
  total: number;
  current: number;
  onSelect: (index: number) => void;
  getAriaLabel: (index: number) => string;
}) => {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, index) => (
        <button
          key={index}
          type="button"
          aria-label={getAriaLabel(index)}
          onClick={() => onSelect(index)}
          className={cn(
            "h-2.5 rounded-full transition-all",
            current === index
              ? "w-8 bg-primary"
              : "w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50",
          )}
        />
      ))}
    </div>
  );
};

const SlideNavButton = ({
  direction,
  disabled,
  onClick,
  label,
}: {
  direction: "previous" | "next";
  disabled: boolean;
  onClick: () => void;
  label: string;
}) => {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "pointer-events-auto absolute top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border/70 bg-background/80 text-foreground shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur-xl transition-all duration-200 sm:size-12",
        direction === "previous" ? "left-3 sm:left-4" : "right-3 sm:right-4",
        disabled
          ? "cursor-not-allowed opacity-35"
          : "hover:scale-105 hover:border-primary/40 hover:bg-background active:scale-95",
      )}
    >
      {direction === "previous" ? (
        <ArrowLeft className="size-4 sm:size-5" />
      ) : (
        <ArrowRight className="size-4 sm:size-5" />
      )}
    </button>
  );
};

const getStepMotionPreset = (
  stepId: string,
  direction: number,
  prefersReducedMotion: boolean,
): StepMotionPreset => {
  if (prefersReducedMotion) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }

  switch (stepId) {
    case "intro":
      return {
        initial: { opacity: 0, scale: 0.94, y: 28, filter: "blur(14px)" },
        animate: { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, scale: 1.03, y: -18, filter: "blur(10px)" },
      };
    case "scale":
      return {
        initial: {
          opacity: 0,
          x: direction > 0 ? 90 : -90,
          skewX: direction > 0 ? -4 : 4,
          filter: "blur(12px)",
        },
        animate: { opacity: 1, x: 0, skewX: 0, filter: "blur(0px)" },
        exit: {
          opacity: 0,
          x: direction > 0 ? -70 : 70,
          skewX: direction > 0 ? 2 : -2,
          filter: "blur(8px)",
        },
      };
    case "loot":
      return {
        initial: {
          opacity: 0,
          scale: 0.9,
          rotate: direction > 0 ? 1.8 : -1.8,
          filter: "blur(14px)",
        },
        animate: { opacity: 1, scale: 1, rotate: 0, filter: "blur(0px)" },
        exit: {
          opacity: 0,
          scale: 1.04,
          rotate: direction > 0 ? -1.4 : 1.4,
          filter: "blur(10px)",
        },
      };
    case "leaders":
      return {
        initial: { opacity: 0, y: 40, scale: 0.97, filter: "blur(12px)" },
        animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
        exit: { opacity: 0, y: -26, scale: 1.02, filter: "blur(8px)" },
      };
    case "coverage":
      return {
        initial: {
          opacity: 0,
          x: direction > 0 ? 120 : -120,
          rotate: direction > 0 ? 2.4 : -2.4,
          scale: 0.95,
          filter: "blur(16px)",
        },
        animate: { opacity: 1, x: 0, rotate: 0, scale: 1, filter: "blur(0px)" },
        exit: {
          opacity: 0,
          x: direction > 0 ? -110 : 110,
          rotate: direction > 0 ? -1.8 : 1.8,
          scale: 0.985,
          filter: "blur(10px)",
        },
      };
    case "finale":
      return {
        initial: {
          opacity: 0,
          scale: 0.92,
          y: 18,
          rotateX: -10,
          filter: "blur(14px)",
        },
        animate: {
          opacity: 1,
          scale: 1,
          y: 0,
          rotateX: 0,
          filter: "blur(0px)",
        },
        exit: {
          opacity: 0,
          scale: 1.05,
          y: -14,
          rotateX: 8,
          filter: "blur(10px)",
        },
      };
    default:
      return {
        initial: {
          opacity: 0,
          x: direction > 0 ? 110 : -110,
          rotate: direction > 0 ? 2.5 : -2.5,
          scale: 0.96,
          filter: "blur(12px)",
        },
        animate: { opacity: 1, x: 0, rotate: 0, scale: 1, filter: "blur(0px)" },
        exit: {
          opacity: 0,
          x: direction > 0 ? -110 : 110,
          rotate: direction > 0 ? -2 : 2,
          scale: 0.985,
          filter: "blur(10px)",
        },
      };
  }
};

const HeroSpotlight = ({
  hero,
  title,
  killsLabel,
  pointsLabel,
  coverageLabel,
}: {
  hero: EventWrappedHero;
  title: string;
  killsLabel: string;
  pointsLabel: string;
  coverageLabel: string;
}) => {
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
      className="relative overflow-hidden rounded-[28px] border border-border/70 bg-background/70 p-4 backdrop-blur-sm"
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
        <Badge variant="outline" className="bg-background/70 text-xs">
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

const RarityBreakdown = ({
  label,
  totals,
  legendaryLabel,
  heroicLabel,
  uniqueLabel,
}: {
  label: string;
  totals: EventWrappedRarityTotals;
  legendaryLabel: string;
  heroicLabel: string;
  uniqueLabel: string;
}) => {
  return (
    <AnimatedPanel
      delay={0.04}
      className="rounded-[28px] border border-border/70 bg-background/70 p-4 backdrop-blur-sm"
    >
      <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <MetricCard
          eyebrow={legendaryLabel}
          value={formatMetric(totals.legendary)}
          caption=""
          tone="danger"
        />
        <MetricCard
          eyebrow={heroicLabel}
          value={formatMetric(totals.heroic)}
          caption=""
          tone="blue"
        />
        <MetricCard
          eyebrow={uniqueLabel}
          value={formatMetric(totals.unique)}
          caption=""
          tone="yellow"
        />
      </div>
    </AnimatedPanel>
  );
};

const LoadingState = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="rounded-[32px] border border-border/70 bg-background/60 p-5">
        <div className="h-4 w-28 rounded-full bg-muted/70" />
        <div className="mt-4 h-12 w-3/4 rounded-2xl bg-muted/60" />
        <div className="mt-3 h-4 w-1/2 rounded-full bg-muted/50" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-32 rounded-[28px] bg-muted/50" />
        <div className="h-32 rounded-[28px] bg-muted/50" />
        <div className="h-32 rounded-[28px] bg-muted/50" />
      </div>
      <div className="rounded-[28px] border border-dashed border-border/70 bg-background/40 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">{title}</p>
        <p className="mt-1">{description}</p>
      </div>
    </div>
  );
};

const buildSteps = (
  t: ReturnType<typeof useTranslation>["t"],
  data: EventWrapped,
): WrappedStep[] => {
  const finaleHero = data.heroes[0] ?? null;
  const heroLootById = new Map(
    data.loot.heroBreakdown.map((heroLoot) => [heroLoot.heroNpcId, heroLoot]),
  );
  const richestHero = [...data.loot.heroBreakdown].sort((left, right) => {
    const rarityScoreLeft =
      left.rarityTotals.legendary * 3 +
      left.rarityTotals.heroic * 2 +
      left.rarityTotals.unique;
    const rarityScoreRight =
      right.rarityTotals.legendary * 3 +
      right.rarityTotals.heroic * 2 +
      right.rarityTotals.unique;

    return (
      rarityScoreRight - rarityScoreLeft || right.totalLoots - left.totalLoots
    );
  })[0];
  const dominantHero = data.heroes[0] ?? null;
  const heroCast = data.heroes.slice(0, 4).map((hero) => ({
    hero,
    loot: heroLootById.get(hero.heroNpcId) ?? null,
  }));
  const averageLootsPerSpawn =
    data.event.spawnCount > 0
      ? data.overview.totalLoots / data.event.spawnCount
      : 0;
  const averageKillsPerParticipant =
    data.overview.participantCount > 0
      ? data.overview.totalKills / data.overview.participantCount
      : 0;
  const averageTrackedSecondsPerParticipant =
    data.overview.participantCount > 0
      ? data.overview.totalTrackedSeconds / data.overview.participantCount
      : 0;
  const averagePointsPerKill =
    data.overview.totalKills > 0
      ? data.overview.totalPoints / data.overview.totalKills
      : 0;
  const averageLootsPerHero =
    data.event.heroCount > 0
      ? data.overview.totalLoots / data.event.heroCount
      : 0;

  return [
    {
      id: "intro",
      label: t("events.summaryDialog.steps.intro.label"),
      title: t("events.summaryDialog.steps.intro.title"),
      description: t("events.summaryDialog.steps.intro.description"),
      content: (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-[32px] border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.18),transparent_32%),rgba(10,14,24,0.92)] p-5 text-primary-foreground shadow-[0_18px_60px_rgba(15,23,42,0.45)]">
            <div className="absolute inset-y-0 right-0 w-40 bg-[linear-gradient(135deg,rgba(255,255,255,0.14),transparent)] blur-2xl" />
            <div className="relative">
              <p className="text-[10px] uppercase tracking-[0.28em] text-primary-foreground/70">
                {t("events.summaryDialog.labels.eventWrapped")}
              </p>
              <h3 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                {data.event.name}
              </h3>
              <p className="mt-3 max-w-xl text-sm text-primary-foreground/70">
                {t("events.summaryDialog.steps.intro.lead")}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="border-white/15 bg-white/10 text-primary-foreground"
                >
                  {data.event.world}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-white/15 bg-white/10 text-primary-foreground"
                >
                  {t("events.summaryDialog.labels.heroesCount", {
                    count: data.event.heroCount,
                  })}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-white/15 bg-white/10 text-primary-foreground"
                >
                  {t("events.summaryDialog.labels.mapsCount", {
                    count: data.event.mapCount,
                  })}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              eyebrow={t("events.summaryDialog.labels.kills")}
              value={formatMetric(data.overview.totalKills)}
              caption={t("events.summaryDialog.captions.killPace")}
            />
            <MetricCard
              eyebrow={t("events.summaryDialog.labels.participants")}
              value={formatMetric(data.overview.participantCount)}
              caption={t("events.summaryDialog.captions.rosterSize")}
              tone="emerald"
            />
            <MetricCard
              eyebrow={t("events.summaryDialog.labels.points")}
              value={formatMetric(data.overview.totalPoints)}
              caption={t("events.summaryDialog.captions.totalPointPool")}
              tone="warm"
            />
            <MetricCard
              eyebrow={t("events.summaryDialog.labels.totalLoots")}
              value={formatMetric(data.overview.totalLoots)}
              caption={t("events.summaryDialog.captions.totalLootPool")}
              tone="yellow"
            />
            <MetricCard
              eyebrow={t("events.summaryDialog.labels.legendary")}
              value={formatMetric(data.overview.rarityTotals.legendary)}
              caption={t("events.summaryDialog.captions.legendaryPressure")}
              tone="danger"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MetricCard
              eyebrow={t("events.summaryDialog.labels.lootsPerSpawn")}
              value={formatMetric(averageLootsPerSpawn)}
              caption={t("events.summaryDialog.captions.lootsPerSpawn")}
              tone="yellow"
            />
          </div>
        </div>
      ),
    },
    {
      id: "scale",
      label: t("events.summaryDialog.steps.scale.label"),
      title: t("events.summaryDialog.steps.scale.title"),
      description: t("events.summaryDialog.steps.scale.description"),
      content: (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              eyebrow={t("events.summaryDialog.labels.points")}
              value={formatMetric(data.overview.totalPoints)}
              caption={t("events.summaryDialog.captions.pointsPool")}
              tone="warm"
            />
            <MetricCard
              eyebrow={t("events.summaryDialog.labels.trackedTime")}
              value={formatDurationHuman(data.overview.totalTrackedSeconds)}
              caption={t("events.summaryDialog.captions.trackedTime")}
            />
            <MetricCard
              eyebrow={t("events.summaryDialog.labels.busiestHour")}
              value={formatHourLabel(data.overview.busiestHour)}
              caption={t("events.summaryDialog.captions.busiestHour", {
                count: data.overview.busiestHourKills,
              })}
              tone="emerald"
            />
            <MetricCard
              eyebrow={t("events.summaryDialog.labels.avgMapsPerSpawn")}
              value={formatMetric(data.overview.avgMapsPerSpawnWindow)}
              caption={t("events.summaryDialog.captions.avgMapsPerSpawn")}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] border border-border/70 bg-background/70 p-4 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                {t("events.summaryDialog.labels.coverage")}
              </p>
              <p className="mt-4 text-4xl font-semibold leading-none">
                {formatMetric(data.overview.coveragePercentage)}%
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                {t("events.summaryDialog.captions.coverage")}
              </p>
            </div>
            <div className="rounded-[28px] border border-border/70 bg-background/70 p-4 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                {t("events.summaryDialog.labels.afkTime")}
              </p>
              <p className="mt-4 text-4xl font-semibold leading-none">
                {formatDurationHuman(data.overview.totalAfkSeconds)}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                {t("events.summaryDialog.captions.afkTime")}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard
              eyebrow={t("events.summaryDialog.labels.averageWatch")}
              value={formatDurationHuman(averageTrackedSecondsPerParticipant)}
              caption={t("events.summaryDialog.captions.averageWatch")}
            />
            <MetricCard
              eyebrow={t("events.summaryDialog.labels.pointsPerKill")}
              value={formatMetric(averagePointsPerKill)}
              caption={t("events.summaryDialog.captions.pointsPerKill")}
              tone="warm"
            />
            <MetricCard
              eyebrow={t("events.summaryDialog.labels.lootsPerHero")}
              value={formatMetric(averageLootsPerHero)}
              caption={t("events.summaryDialog.captions.lootsPerHero")}
              tone="yellow"
            />
          </div>
        </div>
      ),
    },
    {
      id: "loot",
      label: t("events.summaryDialog.steps.loot.label"),
      title: t("events.summaryDialog.steps.loot.title"),
      description: t("events.summaryDialog.steps.loot.description"),
      content: (
        <div className="space-y-4">
          <RarityBreakdown
            label={t("events.summaryDialog.labels.lootTotals")}
            totals={data.loot.rarityTotals}
            legendaryLabel={t("events.summaryDialog.labels.legendary")}
            heroicLabel={t("events.summaryDialog.labels.heroic")}
            uniqueLabel={t("events.summaryDialog.labels.unique")}
          />

          <div className="grid gap-3 lg:grid-cols-2">
            {data.loot.heroBreakdown.slice(0, 4).map((hero) => (
              <div
                key={hero.heroNpcId}
                className="rounded-[28px] border border-border/70 bg-background/70 p-4 backdrop-blur-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                      {t("events.summaryDialog.labels.heroLoots")}
                    </p>
                    <h4 className="mt-2 text-lg font-semibold leading-tight">
                      {hero.npcName}
                    </h4>
                  </div>
                  <Badge variant="outline" className="bg-background/70 text-xs">
                    {formatMetric(hero.totalLoots)}
                  </Badge>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <MetricCard
                    eyebrow={t("events.summaryDialog.labels.legendary")}
                    value={formatMetric(hero.rarityTotals.legendary)}
                    caption=""
                    tone="danger"
                  />
                  <MetricCard
                    eyebrow={t("events.summaryDialog.labels.heroic")}
                    value={formatMetric(hero.rarityTotals.heroic)}
                    caption=""
                    tone="blue"
                  />
                  <MetricCard
                    eyebrow={t("events.summaryDialog.labels.unique")}
                    value={formatMetric(hero.rarityTotals.unique)}
                    caption=""
                    tone="yellow"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "leaders",
      label: t("events.summaryDialog.steps.leaders.label"),
      title: t("events.summaryDialog.steps.leaders.title"),
      description: t("events.summaryDialog.steps.leaders.description"),
      content: (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard
              eyebrow={t("events.summaryDialog.labels.killsPerPlayer")}
              value={formatMetric(averageKillsPerParticipant)}
              caption={t("events.summaryDialog.captions.killsPerPlayer")}
            />
            <MetricCard
              eyebrow={t("events.summaryDialog.labels.pointsPerKill")}
              value={formatMetric(averagePointsPerKill)}
              caption={t("events.summaryDialog.captions.pointsPerKillLeaders")}
              tone="warm"
            />
            <MetricCard
              eyebrow={t("events.summaryDialog.labels.averageWatch")}
              value={formatDurationHuman(averageTrackedSecondsPerParticipant)}
              caption={t("events.summaryDialog.captions.averageWatchLeaders")}
              tone="emerald"
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
            <LeaderCard
              title={t("events.summaryDialog.labels.topHunter")}
              leader={data.leaders.topHunter}
              suffix={t("events.summaryDialog.units.kills")}
            />
            <LeaderCard
              title={t("events.summaryDialog.labels.topScorer")}
              leader={data.leaders.topScorer}
              suffix={t("events.summaryDialog.units.points")}
            />
            <LeaderCard
              title={t("events.summaryDialog.labels.longestDuty")}
              leader={data.leaders.longestDuty}
              value={
                data.leaders.longestDuty
                  ? formatDurationHuman(data.leaders.longestDuty.primaryValue)
                  : undefined
              }
            />
            <LeaderCard
              title={t("events.summaryDialog.labels.topAfk")}
              leader={data.leaders.topAfk}
              value={
                data.leaders.topAfk
                  ? formatDurationHuman(data.leaders.topAfk.primaryValue)
                  : undefined
              }
            />
            <LeaderCard
              title={t("events.summaryDialog.labels.mostFlexible")}
              leader={data.leaders.mostFlexible}
              suffix={t("events.summaryDialog.units.maps")}
              extra={
                data.leaders.mostFlexible?.secondaryValue
                  ? t("events.summaryDialog.captions.flexAvgMapsPerRespawn", {
                      count: data.leaders.mostFlexible.secondaryValue,
                    })
                  : undefined
              }
            />
            <LeaderCard
              title={t("events.summaryDialog.labels.topEfficiency")}
              leader={data.leaders.topEfficiency}
              suffix={t("events.summaryDialog.units.pointsPerKill")}
              extra={
                data.leaders.topEfficiency?.secondaryValue
                  ? t("events.summaryDialog.captions.efficiencyContext", {
                      count: data.leaders.topEfficiency.secondaryValue,
                    })
                  : undefined
              }
            />
          </div>
        </div>
      ),
    },
    {
      id: "coverage",
      label: t("events.summaryDialog.steps.coverage.label"),
      title: t("events.summaryDialog.steps.coverage.title"),
      description: t("events.summaryDialog.steps.coverage.description"),
      content: (
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            {dominantHero ? (
              <div className="relative overflow-hidden rounded-[32px] border border-sky-500/25 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.2),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(250,204,21,0.16),transparent_36%),rgba(8,15,28,0.95)] p-5 text-white shadow-[0_22px_70px_rgba(8,15,28,0.45)]">
                <div className="absolute inset-y-0 right-0 w-36 bg-[linear-gradient(135deg,rgba(255,255,255,0.14),transparent)] blur-3xl" />
                <div className="relative">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/60">
                    {t("events.summaryDialog.labels.dominantHero")}
                  </p>
                  <h4 className="mt-3 text-3xl font-semibold tracking-tight sm:text-[2.6rem]">
                    {dominantHero.npcName}
                  </h4>
                  <p className="mt-3 max-w-xl text-sm text-white/70">
                    {t("events.summaryDialog.captions.dominantHero", {
                      kills: formatMetric(dominantHero.totalKills),
                      points: formatMetric(dominantHero.totalPoints),
                    })}
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <MetricCard
                      eyebrow={t("events.summaryDialog.labels.kills")}
                      value={formatMetric(dominantHero.totalKills)}
                      caption=""
                    />
                    <MetricCard
                      eyebrow={t("events.summaryDialog.labels.points")}
                      value={formatMetric(dominantHero.totalPoints)}
                      caption=""
                      tone="warm"
                    />
                    <MetricCard
                      eyebrow={t("events.summaryDialog.labels.legendary")}
                      value={formatMetric(
                        heroLootById.get(dominantHero.heroNpcId)?.rarityTotals
                          .legendary ?? 0,
                      )}
                      caption=""
                      tone="danger"
                    />
                  </div>

                  {dominantHero.topHunter ? (
                    <p className="mt-4 text-sm text-white/70">
                      {t("events.summaryDialog.captions.topHunterOnHero", {
                        hero: dominantHero.npcName,
                        hunter: dominantHero.topHunter.name,
                      })}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {richestHero ? (
              <div className="rounded-[32px] border border-yellow-500/25 bg-yellow-500/10 p-5 backdrop-blur-sm">
                <p className="text-[10px] uppercase tracking-[0.24em] text-yellow-800 dark:text-yellow-200/80">
                  {t("events.summaryDialog.labels.richestHero")}
                </p>
                <h4 className="mt-3 text-2xl font-semibold leading-tight">
                  {richestHero.npcName}
                </h4>
                <p className="mt-3 text-sm text-muted-foreground">
                  {t("events.summaryDialog.captions.richestHeroPool", {
                    count: richestHero.totalLoots,
                  })}
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <MetricCard
                    eyebrow={t("events.summaryDialog.labels.totalLoots")}
                    value={formatMetric(richestHero.totalLoots)}
                    caption=""
                    tone="yellow"
                  />
                  <MetricCard
                    eyebrow={t("events.summaryDialog.labels.legendary")}
                    value={formatMetric(richestHero.rarityTotals.legendary)}
                    caption=""
                    tone="danger"
                  />
                  <MetricCard
                    eyebrow={t("events.summaryDialog.labels.heroic")}
                    value={formatMetric(richestHero.rarityTotals.heroic)}
                    caption=""
                    tone="blue"
                  />
                  <MetricCard
                    eyebrow={t("events.summaryDialog.labels.unique")}
                    value={formatMetric(richestHero.rarityTotals.unique)}
                    caption=""
                    tone="yellow"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {heroCast.slice(1).map(({ hero, loot }) => (
              <div
                key={hero.heroNpcId}
                className="rounded-[28px] border border-border/70 bg-background/70 p-4 backdrop-blur-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                      {t("events.summaryDialog.labels.heroSpotlight")}
                    </p>
                    <h4 className="mt-2 text-lg font-semibold leading-tight">
                      {hero.npcName}
                    </h4>
                  </div>
                  <Badge variant="outline" className="bg-background/70 text-xs">
                    {formatMetric(hero.mapCount)}{" "}
                    {t("events.summaryDialog.units.maps")}
                  </Badge>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">
                  {t("events.summaryDialog.captions.heroMapSpread", {
                    count: hero.mapCount,
                  })}
                </p>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>
                    {formatMetric(hero.totalKills)}{" "}
                    {t("events.summaryDialog.units.kills")}
                  </span>
                  <span>
                    {formatMetric(hero.totalPoints)}{" "}
                    {t("events.summaryDialog.units.points")}
                  </span>
                  <span>
                    {formatMetric(loot?.rarityTotals.legendary ?? 0)}{" "}
                    {t("events.summaryDialog.labels.legendaryShort")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "finale",
      label: t("events.summaryDialog.steps.finale.label"),
      title: t("events.summaryDialog.steps.finale.title"),
      description: t("events.summaryDialog.steps.finale.description"),
      content: (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            {finaleHero ? (
              <HeroSpotlight
                hero={finaleHero}
                title={t("events.summaryDialog.labels.headlineHero")}
                killsLabel={t("events.summaryDialog.labels.kills")}
                pointsLabel={t("events.summaryDialog.labels.points")}
                coverageLabel={t("events.summaryDialog.labels.coverage")}
              />
            ) : null}
            <div className="rounded-[32px] border border-border/70 bg-background/70 p-5 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                {t("events.summaryDialog.labels.finalHeadline")}
              </p>
              <h4 className="mt-3 text-2xl font-semibold leading-tight">
                {t("events.summaryDialog.captions.finalHeadline", {
                  kills: formatMetric(data.overview.totalKills),
                  participants: formatMetric(data.overview.participantCount),
                })}
              </h4>
              <p className="mt-3 text-sm text-muted-foreground">
                {richestHero
                  ? t("events.summaryDialog.captions.richestHero", {
                      hero: richestHero.npcName,
                      count: richestHero.rarityTotals.legendary,
                    })
                  : t("events.summaryDialog.captions.noRichestHero")}
              </p>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {data.heroes.slice(0, 4).map((hero) => (
              <div
                key={hero.heroNpcId}
                className="rounded-[28px] border border-border/70 bg-background/70 p-4 backdrop-blur-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                      {t("events.summaryDialog.labels.heroSpotlight")}
                    </p>
                    <h4 className="mt-2 text-lg font-semibold leading-tight">
                      {hero.npcName}
                    </h4>
                  </div>
                  <Badge variant="outline" className="bg-background/70 text-xs">
                    {formatMetric(hero.rarityTotals.legendary)}{" "}
                    {t("events.summaryDialog.labels.legendaryShort")}
                  </Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>
                    {formatMetric(hero.totalKills)}{" "}
                    {t("events.summaryDialog.units.kills")}
                  </span>
                  <span>
                    {formatMetric(hero.totalPoints)}{" "}
                    {t("events.summaryDialog.units.points")}
                  </span>
                  <span>{formatMetric(hero.coveragePercentage)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];
};

export const EventSummaryDialog = ({
  open,
  onOpenChange,
  guildId,
  eventId,
  eventName,
}: EventSummaryDialogProps) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const prefersReducedMotion = useReducedMotion();
  const { data, isLoading, error } = useEventWrapped({
    guildId,
    eventId,
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    startTransition(() => {
      setDirection(1);
      setCurrentStep(0);
    });
  }, [open]);

  const steps = data ? buildSteps(t, data) : [];
  const safeStep = Math.min(currentStep, Math.max(steps.length - 1, 0));
  const activeStep = steps[safeStep];
  const hasReducedMotion = Boolean(prefersReducedMotion);
  const stepMotionPreset = activeStep
    ? getStepMotionPreset(activeStep.id, direction, hasReducedMotion)
    : getStepMotionPreset("default", direction, hasReducedMotion);

  const selectStep = (index: number) => {
    if (index === safeStep) {
      return;
    }

    setDirection(index > safeStep ? 1 : -1);

    startTransition(() => {
      setCurrentStep(index);
    });
  };

  const slideTransition: Transition = prefersReducedMotion
    ? { duration: 0.12 }
    : {
        type: "spring",
        stiffness: 240,
        damping: 28,
        mass: 0.9,
      };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[88vh] max-h-[88vh] gap-0 overflow-hidden border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.08),transparent_18%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.08),transparent_22%),hsl(var(--background))] p-0 sm:max-w-5xl sm:h-[min(92vh,820px)] sm:max-h-[min(92vh,820px)] flex flex-col">
        <DialogHeader className="shrink-0 border-b border-border/70 bg-background/80 px-5 pt-5 pb-4 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-primary/10 p-2.5 shadow-inner shadow-primary/10">
                <Sparkles className="size-4 text-primary" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="px-0 pt-0 text-base sm:text-lg">
                  {t("events.summaryDialog.title")}
                </DialogTitle>
                <DialogDescription className="px-0 text-xs sm:text-sm">
                  {eventName}
                </DialogDescription>
                {!isLoading && activeStep ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge
                      variant="outline"
                      className="bg-background/80 text-xs"
                    >
                      {activeStep.label}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="bg-background/80 text-xs"
                    >
                      {t("events.summaryDialog.stepCounter", {
                        current: safeStep + 1,
                        total: steps.length,
                      })}
                    </Badge>
                  </div>
                ) : null}
              </div>
            </div>

            {!isLoading && steps.length > 0 ? (
              <StepDots
                total={steps.length}
                current={safeStep}
                onSelect={selectStep}
                getAriaLabel={(index) =>
                  t("events.summaryDialog.dotAriaLabel", {
                    step: index + 1,
                  })
                }
              />
            ) : null}
          </div>
        </DialogHeader>

        <div className="relative flex-1 min-h-0 overflow-hidden">
          {!prefersReducedMotion ? (
            <>
              <motion.div
                aria-hidden
                className="pointer-events-none absolute left-[-12%] top-[-8%] h-44 w-44 rounded-full bg-sky-500/12 blur-3xl"
                animate={{
                  x: [0, 28, 0],
                  y: [0, 20, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                aria-hidden
                className="pointer-events-none absolute bottom-[-10%] right-[-6%] h-52 w-52 rounded-full bg-yellow-500/12 blur-3xl"
                animate={{
                  x: [0, -24, 0],
                  y: [0, -18, 0],
                  scale: [1.04, 0.96, 1.04],
                }}
                transition={{
                  duration: 12,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              {activeStep ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`ambient-${activeStep.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="pointer-events-none absolute inset-0"
                  >
                    <motion.div
                      aria-hidden
                      className={cn(
                        "absolute blur-3xl",
                        activeStep.id === "intro" &&
                          "left-[8%] top-[12%] h-44 w-44 rounded-full bg-yellow-400/12",
                        activeStep.id === "scale" &&
                          "left-[14%] top-[24%] h-40 w-56 rounded-full bg-emerald-400/10",
                        activeStep.id === "loot" &&
                          "right-[12%] top-[18%] h-44 w-44 rounded-full bg-rose-400/10",
                        activeStep.id === "leaders" &&
                          "left-[18%] bottom-[16%] h-36 w-60 rounded-full bg-sky-400/10",
                        activeStep.id === "coverage" &&
                          "right-[8%] bottom-[18%] h-48 w-48 rounded-full bg-blue-400/12",
                        activeStep.id === "finale" &&
                          "left-[22%] top-[16%] h-44 w-64 rounded-full bg-yellow-300/10",
                      )}
                      animate={{
                        x: [0, activeStep.id === "scale" ? 18 : 12, 0],
                        y: [0, activeStep.id === "leaders" ? -14 : 14, 0],
                        scale: [1, activeStep.id === "loot" ? 1.12 : 1.08, 1],
                      }}
                      transition={{
                        duration: 8.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                    <motion.div
                      aria-hidden
                      className={cn(
                        "absolute blur-3xl",
                        activeStep.id === "intro" &&
                          "right-[14%] bottom-[18%] h-40 w-52 rounded-full bg-sky-400/10",
                        activeStep.id === "scale" &&
                          "right-[10%] bottom-[18%] h-44 w-44 rounded-full bg-yellow-300/10",
                        activeStep.id === "loot" &&
                          "left-[10%] bottom-[20%] h-48 w-60 rounded-full bg-yellow-300/10",
                        activeStep.id === "leaders" &&
                          "right-[12%] top-[20%] h-42 w-42 rounded-full bg-amber-300/10",
                        activeStep.id === "coverage" &&
                          "left-[10%] top-[18%] h-52 w-64 rounded-full bg-cyan-300/10",
                        activeStep.id === "finale" &&
                          "right-[10%] bottom-[14%] h-52 w-52 rounded-full bg-rose-300/10",
                      )}
                      animate={{
                        x: [0, activeStep.id === "coverage" ? -16 : -12, 0],
                        y: [0, activeStep.id === "finale" ? 16 : -10, 0],
                        scale: [1.02, 0.94, 1.02],
                      }}
                      transition={{
                        duration: 10.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.4,
                      }}
                    />
                  </motion.div>
                </AnimatePresence>
              ) : null}
            </>
          ) : null}

          {!isLoading && activeStep ? (
            <div className="pointer-events-none absolute inset-0 z-20">
              <SlideNavButton
                direction="previous"
                disabled={safeStep === 0 || steps.length === 0}
                onClick={() => selectStep(Math.max(safeStep - 1, 0))}
                label={t("events.summaryDialog.previous")}
              />
              <SlideNavButton
                direction="next"
                disabled={steps.length === 0}
                onClick={() => {
                  if (safeStep >= steps.length - 1) {
                    onOpenChange(false);
                    return;
                  }

                  selectStep(Math.min(safeStep + 1, steps.length - 1));
                }}
                label={
                  safeStep >= steps.length - 1
                    ? t("events.summaryDialog.finish")
                    : t("events.summaryDialog.next")
                }
              />
            </div>
          ) : null}

          <div className="relative h-full min-h-0 px-3 pb-3 pt-3 sm:px-5 sm:pb-5 sm:pt-4">
            {isLoading ? (
              <div className="flex h-full items-center justify-center px-2 sm:px-10">
                <div className="w-full max-w-4xl">
                  <LoadingState
                    title={t("events.summaryDialog.loadingTitle")}
                    description={t("events.summaryDialog.loadingDescription")}
                  />
                </div>
              </div>
            ) : error || !data || !activeStep ? (
              <div className="flex h-full items-center justify-center px-2 sm:px-10">
                <div className="w-full max-w-3xl rounded-[32px] border border-dashed border-border/70 bg-background/60 p-8 text-center">
                  <p className="text-sm font-medium text-foreground">
                    {t("events.summaryDialog.errorTitle")}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("events.summaryDialog.errorDescription")}
                  </p>
                </div>
              </div>
            ) : (
              <AnimatePresence custom={direction} initial={false} mode="wait">
                <motion.div
                  key={activeStep.id}
                  custom={direction}
                  initial={stepMotionPreset.initial}
                  animate={stepMotionPreset.animate}
                  exit={stepMotionPreset.exit}
                  transition={slideTransition}
                  className="h-full"
                >
                  <ScrollArea className="h-full">
                    <div className="space-y-4 px-10 pb-6 pt-2 sm:px-14 sm:pb-8 sm:pt-3">
                      <motion.div
                        initial={
                          prefersReducedMotion ? false : { opacity: 0, y: 12 }
                        }
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: prefersReducedMotion ? 0 : 0.08,
                          duration: 0.22,
                        }}
                        className="flex flex-wrap items-center gap-2 text-muted-foreground"
                      >
                        <Badge
                          variant="outline"
                          className="gap-1 bg-background/80 text-xs shadow-sm"
                        >
                          <Sparkles className="size-3" />
                          {activeStep.title}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="gap-1 bg-background/80 text-xs shadow-sm"
                        >
                          <Trophy className="size-3" />
                          {activeStep.description}
                        </Badge>
                      </motion.div>

                      {activeStep.content}
                    </div>
                  </ScrollArea>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
