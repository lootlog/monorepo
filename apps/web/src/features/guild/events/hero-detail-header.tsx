import { PageHeader } from "@/components/common/page-header";
import { NpcTile } from "@/components/tiles";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
import { Swords } from "lucide-react";
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
        {hero.npcName} {hero.npcLvl ? `(${hero.npcLvl})` : ""}
      </>
    }
    description={event.name}
    status={
      <>
        {hero.npcIcon ? (
          <NpcTile
            className="flex w-10 shrink-0 items-center justify-center"
            npc={{
              id: hero.npcId ?? undefined,
              name: hero.npcName,
              icon: hero.npcIcon,
            }}
          />
        ) : (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-yellow-500/10 ring-1 ring-border/70">
            <Swords className="size-4 text-yellow-500" />
          </div>
        )}
      </>
    }
    metadata={
      <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs leading-none text-muted-foreground">
        <HeroTimerCountdown timer={heroTimer} />
        {windowStatus !== "NONE" && (
          <>
            <span aria-hidden="true">·</span>
            <Badge
              variant="outline"
              className={cn(
                "h-5 shrink-0 px-1.5 text-[11px]",
                getWindowStatusConfig(windowStatus, t).className,
              )}
            >
              {getWindowStatusConfig(windowStatus, t).label}
            </Badge>
          </>
        )}
      </div>
    }
    actions={
      <>
        {canManage && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 px-2.5 lg:px-3"
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
