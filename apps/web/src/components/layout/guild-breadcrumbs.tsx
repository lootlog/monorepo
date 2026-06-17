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
import { ArrowLeft } from "lucide-react";
import { SidebarTrigger } from "@lootlog/ui/components/sidebar";
import { AnimatePresence, motion } from "framer-motion";
import { PageHeader } from "@/components/layout/page-header";
import { getNavigationInfo } from "./get-navigation-info";
import {
  getMembersControllerGetGuildMembersQueryKey,
  useMembersControllerGetGuildMembers,
} from "@/lib/api/generated/main/members/members";

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

  const { guildId, eventId, heroId, killId, memberId, reservationId } = params;
  const path = location.pathname;

  const isEventRoute = Boolean(eventId && guildId && path.includes("/events"));
  const isSettingsMemberRoute = Boolean(
    guildId && memberId && path.startsWith(`/${guildId}/settings/members/`),
  );
  const isEventMemberRoute = Boolean(
    params.memberId && path.includes("/members/") && isEventRoute,
  );
  const { data: settingsMembers } = useMembersControllerGetGuildMembers(
    { guildId: guildId ?? "" },
    { includeInactive: true },
    {
      query: {
        enabled: isSettingsMemberRoute,
        queryKey: getMembersControllerGetGuildMembersQueryKey(
          { guildId: guildId ?? "" },
          { includeInactive: true },
        ),
      },
    },
  );
  const event = isEventRoute ? eventRouteData?.event : undefined;
  const eventRankings = isEventMemberRoute
    ? (eventRouteData?.rankings ?? [])
    : [];
  const settingsMemberName = isSettingsMemberRoute
    ? settingsMembers?.find((member) => String(member.id) === memberId)?.name
    : undefined;

  const navInfo = getNavigationInfo({
    path,
    params: { guildId, eventId, heroId, killId, memberId, reservationId },
    guildName: guild?.name,
    eventName: event?.name,
    eventHeroNpcs: event?.heroNpcs,
    eventRankings,
    settingsMemberName,
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
              className="p-1 h-8 w-8 rounded-full hover:bg-muted/50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex flex-1 min-w-0 items-center text-sm justify-center">
          <div
            ref={mobileBreadcrumbsRef}
            className="flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:overflow-hidden"
          >
            <div className="inline-flex min-w-max items-center justify-center gap-1.5 pr-1 md:flex md:min-w-0 md:w-full md:pr-0">
              <AnimatePresence mode="popLayout">
                {navInfo.breadcrumbs.map((crumb, index) => {
                  const isLast = index === navInfo.breadcrumbs.length - 1;
                  return (
                    <motion.div
                      key={`${crumb.label}-${crumb.path ?? "current"}`}
                      className="flex shrink-0 items-center gap-1.5 md:min-w-0 md:last:shrink"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.15 }}
                    >
                      {crumb.path ? (
                        <button
                          type="button"
                          onClick={() => navigate({ to: crumb.path as string })}
                          className="text-xs text-muted-foreground/70 hover:text-foreground transition-colors duration-200 whitespace-nowrap cursor-pointer"
                        >
                          {crumb.label}
                        </button>
                      ) : (
                        <span className="text-sm font-bold text-foreground whitespace-nowrap md:max-w-full md:truncate">
                          {crumb.label}
                        </span>
                      )}
                      {!isLast && (
                        <span className="text-xs text-muted-foreground/30 select-none">
                          /
                        </span>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
        <div className="w-8" />
      </div>
    </PageHeader>
  );
};
