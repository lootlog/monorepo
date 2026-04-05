import { type FC, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "@tanstack/react-router";
import { useGuild } from "@/hooks/api/guilds/use-guild";
import { useEventOverview, useEventRanking } from "@/features/events/hooks";
import { useNpcKillers } from "@/features/stats/hooks/use-npc-killers";
import { useMemberKills } from "@/features/stats/hooks/use-member-kills";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { SidebarTrigger } from "@lootlog/ui/components/sidebar";
import { PageHeader } from "@/components/layout/page-header";
import { getNavigationInfo } from "./get-navigation-info";

export const GuildBreadcrumbs: FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const mobileBreadcrumbsRef = useRef<HTMLDivElement>(null);
  const { data: guild } = useGuild({ retry: false });

  const { guildId, eventId, heroId, killId, reservationId } = params;
  const path = location.pathname;

  const isEventRoute = Boolean(eventId && guildId && path.includes("/events"));
  const isNpcRoute = Boolean(params.npcId && path.includes("/stats/npcs/"));
  const isMemberStatsRoute = Boolean(
    params.memberId && path.includes("/stats/members/"),
  );
  const isEventMemberRoute = Boolean(
    params.memberId && path.includes("/members/") && isEventRoute,
  );
  const npcId = params.npcId ? Number.parseInt(params.npcId, 10) : undefined;
  const memberId = params.memberId
    ? Number.parseInt(params.memberId, 10)
    : undefined;

  const { data: event } = useEventOverview({
    guildId: guildId ?? "",
    eventId: isEventRoute ? (eventId ?? "") : "",
  });
  const { data: eventRankings = [] } = useEventRanking({
    guildId: guildId ?? "",
    eventId: isEventMemberRoute ? (eventId ?? "") : "",
  });
  const { data: npcKillersData } = useNpcKillers(
    isNpcRoute ? npcId : undefined,
  );
  const { data: memberKillsData } = useMemberKills(
    isMemberStatsRoute ? memberId : undefined,
  );

  const navInfo = getNavigationInfo({
    path,
    params: { guildId, eventId, heroId, killId, reservationId },
    guildName: guild?.name,
    eventName: event?.name,
    eventHeroNpcs: event?.heroNpcs,
    eventRankings,
    npcKillersData,
    memberKillsData,
    t,
  });

  const breadcrumbScrollKey = navInfo.breadcrumbs
    .map((crumb) => `${crumb.label}:${crumb.path ?? ""}`)
    .join("|");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 768px)").matches) return;

    const animationFrameId = window.requestAnimationFrame(() => {
      const scrollContainer = mobileBreadcrumbsRef.current;
      if (!scrollContainer) return;

      scrollContainer.scrollTo({
        left: scrollContainer.scrollWidth,
        behavior: "auto",
      });
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [breadcrumbScrollKey, location.pathname]);

  return (
    <PageHeader>
      <div className="flex flex-row gap-2 items-center justify-between w-full">
        <div className="flex flex-row gap-2 items-center">
          <SidebarTrigger />
          {navInfo.showBack && navInfo.backPath && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: navInfo.backPath as string })}
              className="p-1 h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex flex-1 min-w-0 items-center text-sm md:justify-center">
          <div
            ref={mobileBreadcrumbsRef}
            className="flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:overflow-hidden"
          >
            <div className="inline-flex min-w-max items-center gap-1 pr-1 md:flex md:min-w-0 md:w-full md:justify-center md:pr-0">
              {navInfo.breadcrumbs.map((crumb, index) => (
                <div
                  key={index}
                  className="flex shrink-0 items-center gap-1 md:min-w-0 md:last:shrink"
                >
                  {crumb.path ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate({ to: crumb.path as string })}
                      className="h-auto p-1 text-sm font-semibold whitespace-nowrap hover:bg-accent/50"
                    >
                      {crumb.label}
                    </Button>
                  ) : (
                    <span className="px-1 font-semibold whitespace-nowrap md:max-w-full md:truncate">
                      {crumb.label}
                    </span>
                  )}
                  {index < navInfo.breadcrumbs.length - 1 && (
                    <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="w-8" />
      </div>
    </PageHeader>
  );
};
