import {
  DETAIL_BAR_TOOLBAR_CELL_CLASS,
  DetailBar,
} from "@/components/common/detail-bar";
import { formatLevel } from "@lootlog/domain/profession";
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
  | "heroProf"
  | "heroTimer"
  | "canManage"
  | "respawnAction"
  | "handleRespawnActionClick"
  | "RespawnActionIcon"
>;

/** The hero's sprite, level and respawn, with the respawn window action. */
export const HeroDetailHeader = ({
  hero,
  heroProf,
  heroTimer,
  canManage,
  respawnAction,
  handleRespawnActionClick,
  RespawnActionIcon,
}: Props) => (
  <>
    <h1 className="sr-only">{hero.npcName}</h1>
    <DetailBar
      meta={
        <>
          <span className="flex min-w-0 items-center gap-2.5">
            <HeroAvatar hero={hero} />
            <span className="min-w-0 truncate text-sm font-semibold">
              {hero.npcName}
              {hero.npcLvl ? (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  {formatLevel(hero.npcLvl, heroProf)}
                </span>
              ) : null}
            </span>
          </span>
          <HeroTimerCountdown timer={heroTimer} />
        </>
      }
      actions={
        canManage && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  size="lg"
                  variant="chip"
                  className={DETAIL_BAR_TOOLBAR_CELL_CLASS}
                  aria-label={respawnAction.label}
                  onClick={handleRespawnActionClick}
                >
                  <RespawnActionIcon className="size-4" />
                  {respawnAction.label}
                </Button>
              }
            />
            <TooltipContent>{respawnAction.label}</TooltipContent>
          </Tooltip>
        )
      }
    />
  </>
);
