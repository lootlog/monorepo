import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@lootlog/ui/components/button";
import { SectionCard } from "@lootlog/ui/components/section-card";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lootlog/ui/components/toggle-group";
import { ArticleSection } from "@/components/article/article-section";
import { EmptyNotice } from "@/components/common/empty-notice";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { useSkillTree } from "@/hooks/use-skill-tree";
import { useWornItems } from "@/hooks/use-worn-items";
import { t } from "@/i18n/messages";
import {
  BATTLE_MASTERY_SLOTS,
  queueMasteryAction,
} from "@/lib/skills/battle-mastery";
import {
  SKILL_TIER_LEVELS,
  type SkillDefinition,
  skillPlanLevel,
  skillPointsAt,
  skillRankRange,
  skillState,
  spentSkillPoints,
  tierPointsRequired,
  wornSkillWeapons,
} from "@/lib/skills/skill-tree";
import { SetBattleMastery } from "./set-battle-mastery";
import { SkillNode } from "./skill-node";
import { SkillPanel } from "./skill-panel";
import { SkillPoints } from "./skill-points";
import { SkillTier } from "./skill-tier";

const SKILL_FILTERS = ["all", "active", "passive", "learned"] as const;

type SkillFilter = (typeof SKILL_FILTERS)[number];

const isSkillFilter = (value: unknown): value is SkillFilter =>
  SKILL_FILTERS.some((filter) => filter === value);

export function SetSkills() {
  const { set, setSkillRank, resetSkills, changeMastery } = useEquipmentSet();
  const { data: tree, isPending } = useSkillTree(set.profession);
  const weapons = wornSkillWeapons(useWornItems());
  const [chosen, setChosen] = useState<{ id: number; preview?: number }>();
  const [filter, setFilter] = useState<SkillFilter>("all");

  const spent = tree ? spentSkillPoints(tree, set.skills) : 0;
  const total = skillPointsAt(set.level);
  const selected = tree?.find((skill) => skill.id === chosen?.id) ?? tree?.[0];
  const canQueue = set.mastery.actions.length < BATTLE_MASTERY_SLOTS;

  const matchesFilter = (skill: SkillDefinition) => {
    switch (filter) {
      case "all":
        return true;
      case "active":
        return skill.active;
      case "passive":
        return !skill.active;
      case "learned":
        return (set.skills[skill.id] ?? 0) > 0;
    }
  };

  const panel =
    tree && selected ? (
      <SkillPanel
        skill={selected}
        state={skillState(selected, set.skills, set.level, weapons)}
        range={skillRankRange(tree, selected, set.skills, set.level)}
        level={set.level}
        preview={chosen?.id === selected.id ? chosen.preview : undefined}
        onPreviewChange={(preview) => setChosen({ id: selected.id, preview })}
        onRankChange={(rank) => setSkillRank(selected.id, rank)}
      />
    ) : null;

  return (
    <ArticleSection
      id="set-page-skills"
      title={t("skills.title")}
      description={t("skills.description")}
      action={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={spent === 0}
          onClick={resetSkills}
        >
          <RotateCcw aria-hidden="true" />
          {t("skills.reset")}
        </Button>
      }
    >
      {set.profession === null ? (
        <EmptyNotice>{t("skills.noProfession")}</EmptyNotice>
      ) : isPending || !tree ? (
        <EmptyNotice>{t("skills.loading")}</EmptyNotice>
      ) : (
        <div className="@container/skills flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <SkillPoints spent={spent} total={total} />
            <ToggleGroup
              aria-label={t("skills.filter")}
              variant="outline"
              size="sm"
              spacing={1}
              value={[filter]}
              onValueChange={([pressed]) =>
                setFilter(isSkillFilter(pressed) ? pressed : "all")
              }
            >
              {SKILL_FILTERS.map((option) => (
                <ToggleGroupItem key={option} value={option}>
                  {t(`skills.filters.${option}`)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          {spent > total ? (
            <p className="text-sm text-destructive">
              {t("skills.overBudget", { over: spent - total })}
            </p>
          ) : null}
          {set.level === null ? (
            <p className="text-xs text-muted-foreground">
              {t("skills.assumedLevel")}
            </p>
          ) : null}
          <div className="grid items-start gap-3 @5xl/skills:grid-cols-[minmax(0,1fr)_24rem]">
            <SectionCard className="@container/tree divide-y divide-border/60">
              {SKILL_TIER_LEVELS.map((tierLevel) => {
                const requiredPoints = tierPointsRequired(tierLevel);

                return (
                  <SkillTier
                    key={tierLevel}
                    tierLevel={tierLevel}
                    requiredPoints={requiredPoints}
                    isLocked={
                      skillPlanLevel(set.level) < tierLevel ||
                      spent < requiredPoints
                    }
                    skills={tree
                      .filter((skill) => skill.level === tierLevel)
                      .sort((left, right) => left.column - right.column)}
                    selectedId={selected?.id}
                    panel={panel}
                    renderSkill={(skill) => (
                      <SkillNode
                        key={skill.id}
                        skill={skill}
                        state={skillState(
                          skill,
                          set.skills,
                          set.level,
                          weapons,
                        )}
                        range={skillRankRange(
                          tree,
                          skill,
                          set.skills,
                          set.level,
                        )}
                        isSelected={skill.id === selected?.id}
                        isDimmed={!matchesFilter(skill)}
                        canQueue={canQueue}
                        onSelect={() => setChosen({ id: skill.id })}
                        onRankChange={(rank) => setSkillRank(skill.id, rank)}
                        onQueue={() =>
                          changeMastery((mastery) =>
                            queueMasteryAction(mastery, skill.id),
                          )
                        }
                      />
                    )}
                  />
                );
              })}
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-xs text-pretty text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-xs bg-signal-timer"
                  />
                  {t("skills.active")}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="size-2 rounded-xs bg-signal-live"
                  />
                  {t("skills.passive")}
                </span>
                {t("skills.kindsHint")}
              </p>
            </SectionCard>
            <div className="flex flex-col gap-3 @5xl/skills:sticky @5xl/skills:top-(--set-sticky-top,4.5rem) @5xl/skills:max-h-[calc(100dvh-var(--set-sticky-top,4.5rem)-1rem)] @5xl/skills:overflow-y-auto @5xl/skills:[scrollbar-width:thin]">
              <aside
                aria-label={t("skills.panel")}
                className="rounded-lg border border-border bg-card p-4 max-@5xl/skills:hidden"
              >
                {panel}
              </aside>
              <SetBattleMastery tree={tree} weapons={weapons} />
            </div>
          </div>
        </div>
      )}
    </ArticleSection>
  );
}
