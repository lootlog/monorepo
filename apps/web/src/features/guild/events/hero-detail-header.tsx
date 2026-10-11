import { formatLevel } from "@lootlog/domain/profession";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { HeroAvatar } from "./components/shared/hero-avatar";
import { HeroTimerCountdown } from "./components/heroes/hero-timer-countdown";
import type { useHeroDetail } from "./use-hero-detail";
import { getWindowStatusConfig } from "./utils/window-status-presentation";

type Props = Pick<
  Extract<ReturnType<typeof useHeroDetail>, { status: "ready" }>,
  | "hero"
  | "event"
  | "heroTimer"
  | "windowStatus"
  | "t"
  | "canManage"
  | "respawnAction"
  | "handleRespawnActionClick"
  | "RespawnActionIcon"
>;

export const HeroDetailHeader = ({
  hero,
  event,
  heroTimer,
  windowStatus,
  t,
  canManage,
  respawnAction,
  handleRespawnActionClick,
  RespawnActionIcon,
}: Props) => (
  <PageHeader
    title={
      <>
        {hero.npcName}
        {hero.npcLvl ? (
          <span className="ml-2 text-base font-normal text-muted-foreground">
            {formatLevel(hero.npcLvl)}
          </span>
        ) : null}
      </>
    }
    description={event.name}
    media={<HeroAvatar hero={hero} size="portrait" />}
    status={
      windowStatus !== "NONE" && (
        <Badge
          variant={getWindowStatusConfig(windowStatus, t).variant}
          className="h-5 px-2 text-[11px]"
        >
          {getWindowStatusConfig(windowStatus, t).label}
        </Badge>
      )
    }
    actions={
      <>
        <HeroTimerCountdown timer={heroTimer} />
        {canManage && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  className="shrink-0 px-2.5 lg:px-3"
                  aria-label={respawnAction.label}
                  onClick={handleRespawnActionClick}
                >
                  <RespawnActionIcon className="size-4" />
                  <span className="hidden lg:inline">
                    {respawnAction.label}
                  </span>
                </Button>
              }
            />
            <TooltipContent>{respawnAction.label}</TooltipContent>
          </Tooltip>
        )}
      </>
    }
  />
);
