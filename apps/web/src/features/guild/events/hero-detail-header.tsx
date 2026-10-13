import { formatLevel } from "@lootlog/domain/profession";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@lootlog/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { HeroAvatar } from "./components/shared/hero-avatar";
import { HeroTimerCountdown } from "./components/heroes/hero-timer-countdown";
import type { useHeroDetail } from "./use-hero-detail";

type Props = Pick<
  Extract<ReturnType<typeof useHeroDetail>, { status: "ready" }>,
  | "hero"
  | "event"
  | "heroTimer"
  | "canManage"
  | "respawnAction"
  | "handleRespawnActionClick"
  | "RespawnActionIcon"
>;

export const HeroDetailHeader = ({
  hero,
  event,
  heroTimer,
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
