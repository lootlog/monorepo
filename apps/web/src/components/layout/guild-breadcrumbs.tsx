import { type FC, useEffect, useRef } from "react";
import {
  getRouteApi,
  useLocation,
  useMatches,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { SidebarTrigger } from "@lootlog/ui/components/sidebar";
import { PageHeader } from "@/components/layout/page-header";
import { getNavigationInfo } from "./get-navigation-info";

const guildRouteApi = getRouteApi("/_authenticated/$guildId");

export const GuildBreadcrumbs: FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const mobileBreadcrumbsRef = useRef<HTMLDivElement>(null);
  const guildRouteData = guildRouteApi.useLoaderData();
  const eventRouteData = useMatches({
    select: (matches) =>
      matches.find(
        (match) =>
          match.routeId === "/_authenticated/$guildId/events_/$eventId_",
      )?.loaderData as
        | {
            event?: {
              name?: string;
              heroNpcs?: Array<{ id: string; npcName: string }>;
            };
            rankings?: Array<{ memberId: number; member?: { name?: string } }>;
          }
        | undefined,
  });
  const guild = guildRouteData?.guild;

  const { guildId, eventId, heroId, killId, reservationId } = params;
  const path = location.pathname;

  const isEventRoute = Boolean(eventId && guildId && path.includes("/events"));
  const isEventMemberRoute = Boolean(
    params.memberId && path.includes("/members/") && isEventRoute,
  );
  const event = isEventRoute ? eventRouteData?.event : undefined;
  const eventRankings = isEventMemberRoute
    ? (eventRouteData?.rankings ?? [])
    : [];

  const navInfo = getNavigationInfo({
    path,
    params: { guildId, eventId, heroId, killId, reservationId },
    guildName: guild?.name,
    eventName: event?.name,
    eventHeroNpcs: event?.heroNpcs,
    eventRankings,
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
