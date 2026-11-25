import { ArrowDown, ArrowUp, Footprints, Trash2, X } from "lucide-react";
import { useId } from "react";
import { Button } from "@lootlog/ui/components/button";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Label } from "@lootlog/ui/components/label";
import { ArticleSection } from "@/components/article/article-section";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { useSkillTree } from "@/hooks/use-skill-tree";
import { useWornItems } from "@/hooks/use-worn-items";
import { t } from "@/i18n/messages";
import {
  BATTLE_MASTERY_SLOTS,
  moveMasteryAction,
  NORMAL_ATTACK,
  queueMasteryAction,
  STEP_FORWARD,
  removeMasteryAction,
} from "@/lib/skills/battle-mastery";
import { skillState, wornSkillWeapons } from "@/lib/skills/skill-tree";
import { MasteryActionLabel } from "./mastery-action-label";
import { EmptyNotice } from "@/components/common/empty-notice";

export function SetBattleMastery() {
  const { set, changeMastery } = useEquipmentSet();
  const { data: tree } = useSkillTree(set.profession);
  const weapons = wornSkillWeapons(useWornItems());
  const repeatId = useId();

  if (set.profession === null || !tree) return null;

  const { actions, repeat } = set.mastery;
  const isFull = actions.length >= BATTLE_MASTERY_SLOTS;

  const learnedActives = tree.filter(
    (skill) => skill.active && (set.skills[skill.id] ?? 0) > 0,
  );

  const describe = (action: number) => {
    if (action === NORMAL_ATTACK) {
      return { name: t("skills.mastery.normalAttack"), skill: undefined };
    }

    if (action === STEP_FORWARD) {
      return {
        name: t("skills.mastery.stepForward"),
        skill: undefined,
        icon: Footprints,
      };
    }

    const skill = tree.find((candidate) => candidate.id === action);

    if (!skill) return { name: t("skills.mastery.unknown"), skill: undefined };

    const state = skillState(skill, set.skills, set.level, weapons);

    return {
      name: skill.name,
      skill,
      note:
        state.rank === 0
          ? t("skills.mastery.notLearned")
          : state.inactive
            ? t("skills.mastery.inactive")
            : undefined,
    };
  };

  const available = [
    NORMAL_ATTACK,
    STEP_FORWARD,
    ...learnedActives.map((skill) => skill.id),
  ];

  return (
    <ArticleSection
      id="set-page-mastery"
      title={t("skills.mastery.title")}
      description={t("skills.mastery.description")}
      action={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={actions.length === 0}
          onClick={() =>
            changeMastery((mastery) => ({ ...mastery, actions: [] }))
          }
        >
          <Trash2 aria-hidden="true" />
          {t("skills.mastery.clear")}
        </Button>
      }
    >
      <div className="@container/mastery">
        <div className="grid items-start gap-6 @3xl/mastery:grid-cols-2">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold text-foreground">
                {t("skills.mastery.available")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("skills.mastery.availableHint")}
              </p>
            </div>
            <ul className="grid gap-2 @md/mastery:grid-cols-2 @3xl/mastery:grid-cols-1 @5xl/mastery:grid-cols-2">
              {available.map((action) => {
                const { name, skill, icon } = describe(action);

                return (
                  <li key={action} className="min-w-0">
                    <button
                      type="button"
                      aria-label={t("skills.mastery.add", { action: name })}
                      disabled={isFull}
                      onClick={() =>
                        changeMastery((mastery) =>
                          queueMasteryAction(mastery, action),
                        )
                      }
                      className="flex size-full min-w-0 cursor-pointer items-center gap-2.5 rounded-lg border border-border/60 bg-card p-2 text-left outline-none transition-colors duration-150 hover:border-border focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
                    >
                      <MasteryActionLabel
                        name={name}
                        skill={skill}
                        icon={icon}
                        isMuted={false}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
            {learnedActives.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("skills.mastery.noActives")}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex min-h-8 items-center justify-between gap-4">
              <h3 className="text-sm font-semibold text-foreground">
                {t("skills.mastery.queue")}
              </h3>
              <span className="text-sm font-medium text-muted-foreground tabular-nums">
                {t("skills.mastery.slots", {
                  used: actions.length,
                  max: BATTLE_MASTERY_SLOTS,
                })}
              </span>
            </div>
            {actions.length === 0 ? (
              <EmptyNotice>{t("skills.mastery.empty")}</EmptyNotice>
            ) : (
              <ol className="flex flex-col gap-2">
                {actions.map((action, index) => {
                  const { name, skill, icon, note } = describe(action);

                  return (
                    <li
                      key={`${index}-${action}`}
                      className="flex min-w-0 items-center gap-2 rounded-lg border border-border/60 bg-card p-2"
                    >
                      <span className="w-6 shrink-0 text-right text-sm font-semibold text-muted-foreground tabular-nums">
                        {index + 1}.
                      </span>
                      <MasteryActionLabel
                        name={name}
                        skill={skill}
                        icon={icon}
                        note={note}
                        isMuted={note !== undefined}
                      />
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("skills.mastery.moveUp", {
                            action: name,
                          })}
                          disabled={index === 0}
                          onClick={() =>
                            changeMastery((mastery) =>
                              moveMasteryAction(mastery, index, -1),
                            )
                          }
                        >
                          <ArrowUp aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("skills.mastery.moveDown", {
                            action: name,
                          })}
                          disabled={index === actions.length - 1}
                          onClick={() =>
                            changeMastery((mastery) =>
                              moveMasteryAction(mastery, index, 1),
                            )
                          }
                        >
                          <ArrowDown aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("skills.mastery.remove", {
                            action: name,
                          })}
                          onClick={() =>
                            changeMastery((mastery) =>
                              removeMasteryAction(mastery, index),
                            )
                          }
                        >
                          <X aria-hidden="true" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={repeatId}
                  checked={repeat}
                  onCheckedChange={(checked) =>
                    changeMastery((mastery) => ({
                      ...mastery,
                      repeat: checked === true,
                    }))
                  }
                />
                <Label htmlFor={repeatId} className="cursor-pointer text-sm">
                  {t("skills.mastery.repeat")}
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                {repeat
                  ? t("skills.mastery.repeatOn")
                  : t("skills.mastery.repeatOff")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </ArticleSection>
  );
}
