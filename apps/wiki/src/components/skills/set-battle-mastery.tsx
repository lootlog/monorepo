import { Footprints, type LucideIcon, Sword, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@lootlog/ui/components/button";
import { Checkbox } from "@lootlog/ui/components/checkbox";
import { Label } from "@lootlog/ui/components/label";
import { SectionCard } from "@lootlog/ui/components/section-card";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { t } from "@/i18n/messages";
import {
  BATTLE_MASTERY_SLOTS,
  moveMasteryAction,
  NORMAL_ATTACK,
  queueMasteryAction,
  removeMasteryAction,
  STEP_FORWARD,
} from "@/lib/skills/battle-mastery";
import {
  type SkillDefinition,
  skillState,
  type SkillWeapon,
} from "@/lib/skills/skill-tree";
import { MasterySlot } from "./mastery-slot";
import { SkillIcon } from "./skill-icon";

type SetBattleMasteryProps = {
  tree: readonly SkillDefinition[];
  weapons: ReadonlySet<SkillWeapon>;
};

type DescribedAction = {
  name: string;
  skill?: SkillDefinition;
  icon?: LucideIcon;
  note?: string;
};

const DEFAULT_ACTIONS = [
  { action: NORMAL_ATTACK, name: "skills.mastery.normalAttack", icon: Sword },
  {
    action: STEP_FORWARD,
    name: "skills.mastery.stepForward",
    icon: Footprints,
  },
] as const;

export function SetBattleMastery({ tree, weapons }: SetBattleMasteryProps) {
  const { set, changeMastery } = useEquipmentSet();
  const [dragged, setDragged] = useState<number | null>(null);
  const titleId = useId();
  const repeatId = useId();

  const { actions, repeat } = set.mastery;
  const isFull = actions.length >= BATTLE_MASTERY_SLOTS;

  const learnedActives = tree.filter(
    (skill) => skill.active && (set.skills[skill.id] ?? 0) > 0,
  );

  const describe = (action: number): DescribedAction => {
    const base = DEFAULT_ACTIONS.find(
      (candidate) => candidate.action === action,
    );

    if (base) return { name: t(base.name), icon: base.icon };

    const skill = tree.find((candidate) => candidate.id === action);

    if (!skill) return { name: t("skills.mastery.unknown") };

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

  const queue = (action: number) =>
    changeMastery((mastery) => queueMasteryAction(mastery, action));

  const move = (from: number, to: number) =>
    changeMastery((mastery) => moveMasteryAction(mastery, from, to));

  return (
    <SectionCard aria-labelledby={titleId}>
      <SectionCardHeader
        id={titleId}
        title={t("skills.mastery.title")}
        description={t("skills.mastery.description")}
        actions={
          <>
            <span className="text-xs text-muted-foreground tabular-nums">
              {t("skills.mastery.slots", {
                used: actions.length,
                max: BATTLE_MASTERY_SLOTS,
              })}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={actions.length === 0}
              onClick={() =>
                changeMastery((mastery) => ({ ...mastery, actions: [] }))
              }
            >
              <Trash2 aria-hidden="true" />
              {t("skills.mastery.clear")}
            </Button>
          </>
        }
      />
      <div className="flex flex-col gap-1.5 border-b border-border/70 p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            {t("skills.mastery.available")}
          </span>
          {DEFAULT_ACTIONS.map(({ action, name, icon: Icon }) => (
            <Button
              key={action}
              type="button"
              size="xs"
              variant="outline"
              disabled={isFull}
              aria-label={t("skills.mastery.add", { action: t(name) })}
              onClick={() => queue(action)}
            >
              <Icon aria-hidden="true" />
              {t(name)}
            </Button>
          ))}
          {learnedActives.map((skill) => (
            <button
              key={skill.id}
              type="button"
              title={skill.name}
              aria-label={t("skills.mastery.add", { action: skill.name })}
              disabled={isFull}
              onClick={() => queue(skill.id)}
              className="flex cursor-pointer rounded-md outline-none hover:brightness-125 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              <SkillIcon skill={skill} isMuted={false} />
            </button>
          ))}
        </div>
        {learnedActives.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t("skills.mastery.noActives")}
          </p>
        ) : null}
      </div>
      <ol aria-label={t("skills.mastery.queue")} className="flex flex-col">
        {actions.map((action, index) => {
          const described = describe(action);

          return (
            <MasterySlot
              key={`${index}-${action}`}
              position={index + 1}
              name={described.name}
              skill={described.skill}
              icon={described.icon}
              note={described.note}
              isDragged={dragged === index}
              onDragStart={() => setDragged(index)}
              onDrop={() => {
                if (dragged !== null) move(dragged, index);

                setDragged(null);
              }}
              onMoveUp={index === 0 ? null : () => move(index, index - 1)}
              onMoveDown={
                index === actions.length - 1
                  ? null
                  : () => move(index, index + 1)
              }
              onRemove={() =>
                changeMastery((mastery) => removeMasteryAction(mastery, index))
              }
            />
          );
        })}
        {isFull ? null : (
          <li className="flex min-h-9 items-center gap-2 border-b border-border/40 px-3 text-xs text-muted-foreground">
            <span className="w-5 shrink-0 text-right tabular-nums">
              {actions.length + 1}
            </span>
            {actions.length === 0
              ? t("skills.mastery.empty")
              : t("skills.mastery.freeSlot")}
          </li>
        )}
      </ol>
      <div className="flex flex-col gap-1 p-3">
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
    </SectionCard>
  );
}
