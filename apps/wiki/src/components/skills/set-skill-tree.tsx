import { RotateCcw } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { ArticleSection } from "@/components/article/article-section";
import { StatTiles } from "@/components/common/stat-tiles";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { useSkillTree } from "@/hooks/use-skill-tree";
import { useWornItems } from "@/hooks/use-worn-items";
import { t } from "@/i18n/messages";
import {
  SKILL_TIER_LEVELS,
  skillPointsAt,
  spentSkillPoints,
  wornSkillWeapons,
} from "@/lib/skills/skill-tree";
import { SkillTier } from "./skill-tier";

const Notice = ({ children }: { children: string }) => (
  <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
    {children}
  </p>
);

/**
 * The set's skills as the game's skill window hands them out: points by the
 * character's level, tiers that open with the level and spent points, and
 * each skill's rank.
 */
export function SetSkillTree() {
  const { set, setSkillRank, resetSkills } = useEquipmentSet();
  const { data: tree, isPending } = useSkillTree(set.profession);
  const weapons = wornSkillWeapons(useWornItems());

  const spent = tree ? spentSkillPoints(tree, set.skills) : 0;
  const total = skillPointsAt(set.level);

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
        <Notice>{t("skills.noProfession")}</Notice>
      ) : isPending || !tree ? (
        <Notice>{t("skills.loading")}</Notice>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <StatTiles
              className="grid-cols-1 sm:max-w-xs"
              tiles={[
                {
                  label: t("skills.points"),
                  value: t("skills.pointsValue", { spent, total }),
                  hint: t("skills.pointsLeft", {
                    left: Math.max(0, total - spent),
                  }),
                },
              ]}
            />
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
            <p className="text-xs text-muted-foreground">
              {t("skills.raiseHint")}
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {SKILL_TIER_LEVELS.map((tierLevel) => (
              <SkillTier
                key={tierLevel}
                tree={tree}
                tierLevel={tierLevel}
                ranks={set.skills}
                level={set.level}
                weapons={weapons}
                onRankChange={setSkillRank}
              />
            ))}
          </div>
        </>
      )}
    </ArticleSection>
  );
}
