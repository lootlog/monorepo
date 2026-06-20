import { Badge } from "@lootlog/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "@lootlog/ui/lib/utils";
import {
  Biohazard,
  Flame,
  HeartCrack,
  Snowflake,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { type ComponentProps, type HTMLAttributes } from "react";
import { useTranslation } from "react-i18next";

type BattleDamageTagKey = "fire" | "frost" | "lightning" | "poison" | "wound";

export type BattleDamageTagWarrior = {
  critWoundDamageTaken?: number | null;
  fireDamage?: number | null;
  frostDamage?: number | null;
  lightningDamage?: number | null;
  poisonDamageTaken?: number | null;
  woundDamageTaken?: number | null;
};

type BattleDamageTag = {
  badgeClassName: string;
  icon: LucideIcon;
  key: BattleDamageTagKey;
};

type BattleDamageTagsProps = {
  badgeProps?: ComponentProps<typeof Badge>;
  battleTableAction?: boolean;
  className?: string;
  containerProps?: HTMLAttributes<HTMLDivElement>;
  opposingTeam: BattleDamageTagWarrior[];
  team: BattleDamageTagWarrior[];
};

const DAMAGE_TAG_CONFIG: Record<
  BattleDamageTagKey,
  Pick<BattleDamageTag, "badgeClassName" | "icon">
> = {
  fire: {
    badgeClassName: "border-red-500/20 bg-red-500/5 text-red-300",
    icon: Flame,
  },
  frost: {
    badgeClassName: "border-cyan-500/20 bg-cyan-500/5 text-cyan-300",
    icon: Snowflake,
  },
  lightning: {
    badgeClassName: "border-yellow-500/20 bg-yellow-500/5 text-yellow-300",
    icon: Zap,
  },
  poison: {
    badgeClassName: "border-green-500/20 bg-green-500/5 text-green-300",
    icon: Biohazard,
  },
  wound: {
    badgeClassName: "border-orange-500/20 bg-orange-500/5 text-orange-300",
    icon: HeartCrack,
  },
};

const sumWarriorValues = (
  warriors: BattleDamageTagWarrior[],
  getValue: (warrior: BattleDamageTagWarrior) => number | null | undefined,
) =>
  warriors.reduce((total, warrior) => {
    const value = getValue(warrior);
    const safeValue =
      typeof value === "number" && Number.isFinite(value) ? value : 0;

    return total + safeValue;
  }, 0);

export const getBattleDamageTags = (
  team: BattleDamageTagWarrior[],
  opposingTeam: BattleDamageTagWarrior[],
) => {
  const tags: BattleDamageTag[] = [];

  if (sumWarriorValues(team, (warrior) => warrior.fireDamage) > 0) {
    tags.push({ key: "fire", ...DAMAGE_TAG_CONFIG.fire });
  }

  if (sumWarriorValues(team, (warrior) => warrior.frostDamage) > 0) {
    tags.push({ key: "frost", ...DAMAGE_TAG_CONFIG.frost });
  }

  if (sumWarriorValues(team, (warrior) => warrior.lightningDamage) > 0) {
    tags.push({ key: "lightning", ...DAMAGE_TAG_CONFIG.lightning });
  }

  if (
    sumWarriorValues(opposingTeam, (warrior) => warrior.poisonDamageTaken) > 0
  ) {
    tags.push({ key: "poison", ...DAMAGE_TAG_CONFIG.poison });
  }

  if (
    sumWarriorValues(
      opposingTeam,
      (warrior) =>
        (warrior.woundDamageTaken ?? 0) + (warrior.critWoundDamageTaken ?? 0),
    ) > 0
  ) {
    tags.push({ key: "wound", ...DAMAGE_TAG_CONFIG.wound });
  }

  return tags;
};

export function BattleDamageTags({
  badgeProps,
  battleTableAction = false,
  className,
  containerProps,
  opposingTeam,
  team,
}: BattleDamageTagsProps) {
  const { t } = useTranslation();
  const tags = getBattleDamageTags(team, opposingTeam);

  if (tags.length === 0) {
    return null;
  }

  const { className: containerClassName, ...restContainerProps } =
    containerProps ?? {};
  const {
    className: badgeClassName,
    tabIndex: badgeTabIndex,
    ...restBadgeProps
  } = badgeProps ?? {};

  return (
    <div
      {...restContainerProps}
      data-battle-table-action={battleTableAction ? "" : undefined}
      className={cn(
        "flex shrink-0 items-center gap-0.5",
        containerClassName,
        className,
      )}
    >
      {tags.map((tag) => {
        const Icon = tag.icon;
        const tagLabel = t(`battlePanel.list.damageTags.${tag.key}`);

        return (
          <Tooltip key={tag.key}>
            <TooltipTrigger asChild>
              <Badge
                {...restBadgeProps}
                data-battle-table-action={battleTableAction ? "" : undefined}
                tabIndex={badgeTabIndex ?? 0}
                role="img"
                aria-label={tagLabel}
                variant="outline"
                className={cn(
                  "inline-flex size-5 min-w-5 items-center justify-center rounded-full p-0 shadow-none",
                  tag.badgeClassName,
                  badgeClassName,
                )}
              >
                <Icon className="size-3" aria-hidden="true" />
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{tagLabel}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
