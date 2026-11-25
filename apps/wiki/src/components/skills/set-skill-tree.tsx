import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@lootlog/ui/components/button";
import { ArticleSection } from "@/components/article/article-section";
import { StatsTile } from "@lootlog/ui/components/stats-tile";
import { StatsTileGrid } from "@lootlog/ui/components/stats-tile-grid";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { useSkillTree } from "@/hooks/use-skill-tree";
import { useWornItems } from "@/hooks/use-worn-items";
import { t } from "@/i18n/messages";
import {
  SKILL_TIER_LEVELS,
  skillPointsAt,
  skillRankRange,
  skillState,
  spentSkillPoints,
  wornSkillWeapons,
} from "@/lib/skills/skill-tree";
import { SkillPanel } from "./skill-panel";
import { SkillTier } from "./skill-tier";
import { EmptyNotice } from "@/components/common/empty-notice";

export function SetSkillTree() {
  const { set, setSkillRank, resetSkills } = useEquipmentSet();
  const { data: tree, isPending } = useSkillTree(set.profession);
  const weapons = wornSkillWeapons(useWornItems());

  const [chosen, setChosen] = useState<{ id: number; preview?: number }>();

  const spent = tree ? spentSkillPoints(tree, set.skills) : 0;
  const total = skillPointsAt(set.level);

  const selected = tree?.find((skill) => skill.id === chosen?.id) ?? tree?.[0];

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
        <>
          <div className="flex flex-col gap-2">
            <div className="sm:max-w-xs">
              <StatsTileGrid framed aria-live="polite">
                <StatsTile
                  label={t("skills.points")}
                  value={t("skills.pointsValue", { spent, total })}
                  detail={t("skills.pointsLeft", {
                    left: Math.max(0, total - spent),
                  })}
                />
              </StatsTileGrid>
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
            <p className="text-xs text-pretty text-muted-foreground">
              {t("skills.kindsHint")}
            </p>
          </div>
          <div className="@container/skills">
            <div className="grid items-start gap-6 @4xl/skills:grid-cols-[minmax(0,1fr)_21rem]">
              <div className="@container flex flex-col gap-5">
                {SKILL_TIER_LEVELS.map((tierLevel) => (
                  <SkillTier
                    key={tierLevel}
                    tree={tree}
                    tierLevel={tierLevel}
                    ranks={set.skills}
                    level={set.level}
                    weapons={weapons}
                    selectedId={selected?.id}
                    onSelect={(id) => setChosen({ id })}
                    panel={panel}
                  />
                ))}
              </div>
              <aside
                aria-label={t("skills.panel")}
                className="sticky top-[4.5rem] rounded-lg border border-border bg-card p-4 max-@4xl/skills:hidden"
              >
                {panel}
              </aside>
            </div>
          </div>
        </>
      )}
    </ArticleSection>
  );
}
