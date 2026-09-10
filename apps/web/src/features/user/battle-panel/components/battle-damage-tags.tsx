import {
  getBattleDamageTags,
  type BattleDamageTagWarrior,
} from "./battle-damage-tag-data";
import { Badge } from "@lootlog/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
import type { ComponentProps, HTMLAttributes } from "react";
import { useTranslation } from "react-i18next";

type BattleDamageTagsProps = {
  badgeProps?: ComponentProps<typeof Badge>;
  battleTableAction?: boolean;
  className?: string;
  containerProps?: HTMLAttributes<HTMLDivElement>;
  opposingTeam: BattleDamageTagWarrior[];
  team: BattleDamageTagWarrior[];
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
            <TooltipTrigger
              render={
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
              }
            />
            <TooltipContent>{tagLabel}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
