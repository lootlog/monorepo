import type { useTranslation } from "react-i18next";
import { Badge } from "@lootlog/ui/components/badge";
import type { EventWrapped } from "../../../types/api";
import { formatDurationHuman } from "../../../utils";
import { HeroSpotlight } from "./hero-spotlight";
import { LeaderCard } from "./leader-card";
import { MetricCard } from "./metric-card";
import { RarityBreakdown } from "./rarity-breakdown";
import { formatHourLabel, formatMetric } from "./utils";

export type WrappedStep = {
  id: string;
  label: string;
  title: string;
  description: string;
  content: React.ReactNode;
};

export const buildSteps = (
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
