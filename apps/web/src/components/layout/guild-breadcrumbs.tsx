import { type FC, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "@tanstack/react-router";
import { useGuild } from "@/hooks/api/guilds/use-guild";
import { useEventOverview, useEventRanking } from "@/features/events/hooks";
import { useNpcKillers } from "@/features/stats/hooks/use-npc-killers";
import { useMemberKills } from "@/features/stats/hooks/use-member-kills";
import { ROUTES } from "@/config/routes";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { SidebarTrigger } from "@lootlog/ui/components/sidebar";
import { PageHeader } from "@/components/layout/page-header";

type Breadcrumb = {
  label: string;
  path: string | null;
};

type NavigationInfo = {
  breadcrumbs: Breadcrumb[];
  showBack: boolean;
  backPath?: string;
};

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

  const { data: event } = useEventOverview({
    guildId: guildId ?? "",
    eventId: isEventRoute ? (eventId ?? "") : "",
  });
  const { data: eventRankings = [] } = useEventRanking({
    guildId: guildId ?? "",
    eventId: isEventMemberRoute ? (eventId ?? "") : "",
  });
  const { data: npcKillersData } = useNpcKillers(
    isNpcRoute ? Number.parseInt(params.npcId!, 10) : undefined,
  );
  const { data: memberKillsData } = useMemberKills(
    isMemberStatsRoute ? Number.parseInt(params.memberId!, 10) : undefined,
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

type NavigationParams = {
  guildId?: string;
  eventId?: string;
  heroId?: string;
  killId?: string;
  reservationId?: string;
  memberId?: string;
  npcId?: string;
};

type GetNavigationInfoArgs = {
  path: string;
  params: NavigationParams;
  guildName?: string;
  eventName?: string;
  eventHeroNpcs?: Array<{ id: string; npcName: string }>;
  eventRankings: Array<{ memberId: number; member?: { name?: string } }>;
  npcKillersData?: { npc?: { npcName?: string } | null };
  memberKillsData?: { member?: { memberName?: string } | null };
  t: (key: string, options?: Record<string, unknown>) => string;
};

function getNavigationInfo({
  path,
  params,
  guildName,
  eventName,
  eventHeroNpcs,
  eventRankings,
  npcKillersData,
  memberKillsData,
  t,
}: GetNavigationInfoArgs): NavigationInfo {
  const { guildId, reservationId, eventId, heroId, killId } = params;

  if (!guildId) {
    return {
      breadcrumbs: [
        { label: guildName || t("common.breadcrumbs.guild"), path: null },
      ],
      showBack: false,
    };
  }

  const guildBase = ROUTES.guild.base(guildId);
  const guildTimers = ROUTES.guild.timers(guildId);
  const guildReservations = ROUTES.guild.reservations.base(guildId);
  const guildStats = ROUTES.guild.stats(guildId);
  const guildSettings = ROUTES.guild.settings.base(guildId);
  const guildSettingsRoles = ROUTES.guild.settings.roles(guildId);
  const guildSettingsMembers = ROUTES.guild.settings.members(guildId);
  const guildSettingsNpcs = ROUTES.guild.settings.npcs(guildId);
  const guildActivityLogs = ROUTES.guild.activityLogs(guildId);
  const guildEvents = ROUTES.guild.events(guildId);

  const guildBreadcrumb: Breadcrumb = {
    label: guildName || t("common.breadcrumbs.guild"),
    path: guildBase,
  };

  if (path === guildBase) {
    return {
      breadcrumbs: [{ label: t("common.breadcrumbs.lootsList"), path: null }],
      showBack: false,
    };
  }

  if (path === guildTimers) {
    return {
      breadcrumbs: [
        guildBreadcrumb,
        { label: t("common.breadcrumbs.timers"), path: null },
      ],
      showBack: true,
      backPath: guildBase,
    };
  }

  if (path === guildReservations) {
    return {
      breadcrumbs: [
        guildBreadcrumb,
        { label: t("common.breadcrumbs.reservations"), path: null },
      ],
      showBack: true,
      backPath: guildBase,
    };
  }

  if (path.startsWith(guildReservations)) {
    return {
      breadcrumbs: [
        guildBreadcrumb,
        {
          label: t("common.breadcrumbs.reservations"),
          path: guildReservations,
        },
        {
          label: reservationId
            ? reservationId.charAt(0).toUpperCase() + reservationId.slice(1)
            : (reservationId ?? ""),
          path: null,
        },
      ],
      showBack: true,
      backPath: guildReservations,
    };
  }

  if (path === guildActivityLogs) {
    return {
      breadcrumbs: [
        guildBreadcrumb,
        { label: t("common.breadcrumbs.activityLogs"), path: null },
      ],
      showBack: true,
      backPath: guildBase,
    };
  }

  if (path === guildStats) {
    return {
      breadcrumbs: [
        guildBreadcrumb,
        { label: t("common.breadcrumbs.stats"), path: null },
      ],
      showBack: true,
      backPath: guildBase,
    };
  }

  const guildStatsRanking = `${guildStats}/ranking`;
  if (path === guildStatsRanking) {
    return {
      breadcrumbs: [
        guildBreadcrumb,
        { label: t("common.breadcrumbs.stats"), path: guildStats },
        { label: t("common.breadcrumbs.memberRanking"), path: null },
      ],
      showBack: true,
      backPath: guildStats,
    };
  }

  const guildStatsNpcs = `${guildStats}/npcs`;
  if (path === guildStatsNpcs) {
    return {
      breadcrumbs: [
        guildBreadcrumb,
        { label: t("common.breadcrumbs.stats"), path: guildStats },
        { label: t("common.breadcrumbs.npcs"), path: null },
      ],
      showBack: true,
      backPath: guildStats,
    };
  }

  if (path.startsWith(`${guildStats}/npcs/`)) {
    return {
      breadcrumbs: [
        guildBreadcrumb,
        { label: t("common.breadcrumbs.stats"), path: guildStats },
        { label: t("common.breadcrumbs.npcs"), path: guildStatsNpcs },
        {
          label:
            npcKillersData?.npc?.npcName ||
            t("common.breadcrumbs.npcFallback", { id: params.npcId }),
          path: null,
        },
      ],
      showBack: true,
      backPath: guildStatsNpcs,
    };
  }

  if (path.startsWith(`${guildStats}/members/`)) {
    return {
      breadcrumbs: [
        guildBreadcrumb,
        { label: t("common.breadcrumbs.stats"), path: guildStats },
        {
          label: t("common.breadcrumbs.memberRanking"),
          path: guildStatsRanking,
        },
        {
          label:
            memberKillsData?.member?.memberName ||
            t("common.breadcrumbs.memberFallback", { id: params.memberId }),
          path: null,
        },
      ],
      showBack: true,
      backPath: guildStatsRanking,
    };
  }

  if (path === guildEvents) {
    return {
      breadcrumbs: [
        guildBreadcrumb,
        { label: t("common.breadcrumbs.events"), path: null },
      ],
      showBack: true,
      backPath: guildBase,
    };
  }

  if (path === `${guildEvents}/create`) {
    return {
      breadcrumbs: [
        guildBreadcrumb,
        { label: t("common.breadcrumbs.events"), path: guildEvents },
        { label: t("common.breadcrumbs.newEvent"), path: null },
      ],
      showBack: true,
      backPath: guildEvents,
    };
  }

  if (path.startsWith(guildEvents) && eventId) {
    const guildEventDetail = `${guildEvents}/${eventId}`;
    const guildEventRanking = `${guildEventDetail}/ranking`;
    const eventBreadcrumb: Breadcrumb = {
      label: eventName || t("common.breadcrumbs.event"),
      path: guildEventDetail,
    };

    if (path === `${guildEventDetail}/kills`) {
      return {
        breadcrumbs: [
          guildBreadcrumb,
          { label: t("common.breadcrumbs.events"), path: guildEvents },
          eventBreadcrumb,
          { label: t("common.breadcrumbs.killHistory"), path: null },
        ],
        showBack: true,
        backPath: guildEventDetail,
      };
    }

    if (
      params.memberId &&
      path === `${guildEventDetail}/members/${params.memberId}`
    ) {
      const selectedMemberRanking = eventRankings.find(
        (ranking) => String(ranking.memberId) === params.memberId,
      );
      return {
        breadcrumbs: [
          guildBreadcrumb,
          { label: t("common.breadcrumbs.events"), path: guildEvents },
          eventBreadcrumb,
          { label: t("common.breadcrumbs.ranking"), path: guildEventRanking },
          {
            label:
              selectedMemberRanking?.member?.name ||
              t("common.breadcrumbs.memberFallback", { id: params.memberId }),
            path: null,
          },
        ],
        showBack: true,
        backPath: guildEventRanking,
      };
    }

    if (heroId && path === `${guildEventDetail}/heroes/${heroId}/kills`) {
      const heroPath = `${guildEventDetail}/heroes/${heroId}`;
      return {
        breadcrumbs: [
          guildBreadcrumb,
          { label: t("common.breadcrumbs.events"), path: guildEvents },
          eventBreadcrumb,
          {
            label:
              eventHeroNpcs?.find((h) => h.id === heroId)?.npcName ||
              t("common.breadcrumbs.hero"),
            path: heroPath,
          },
          { label: t("common.breadcrumbs.killHistory"), path: null },
        ],
        showBack: true,
        backPath: heroPath,
      };
    }

    if (killId && path.includes("/kills/")) {
      const heroPath = `${guildEventDetail}/heroes/${heroId}`;
      return {
        breadcrumbs: [
          guildBreadcrumb,
          { label: t("common.breadcrumbs.events"), path: guildEvents },
          eventBreadcrumb,
          {
            label:
              eventHeroNpcs?.find((h) => h.id === heroId)?.npcName ||
              t("common.breadcrumbs.hero"),
            path: heroPath,
          },
          { label: killId ?? "Kill", path: null },
        ],
        showBack: true,
        backPath: heroPath,
      };
    }

    if (heroId && path.includes("/heroes/")) {
      return {
        breadcrumbs: [
          guildBreadcrumb,
          { label: t("common.breadcrumbs.events"), path: guildEvents },
          eventBreadcrumb,
          {
            label:
              eventHeroNpcs?.find((h) => h.id === heroId)?.npcName ||
              t("common.breadcrumbs.hero"),
            path: null,
          },
        ],
        showBack: true,
        backPath: guildEventDetail,
      };
    }

    if (path === guildEventRanking) {
      return {
        breadcrumbs: [
          guildBreadcrumb,
          { label: t("common.breadcrumbs.events"), path: guildEvents },
          eventBreadcrumb,
          { label: t("common.breadcrumbs.ranking"), path: null },
        ],
        showBack: true,
        backPath: guildEventDetail,
      };
    }

    return {
      breadcrumbs: [
        guildBreadcrumb,
        { label: t("common.breadcrumbs.events"), path: guildEvents },
        {
          label: eventName || t("common.breadcrumbs.event"),
          path: null,
        },
      ],
      showBack: true,
      backPath: guildEvents,
    };
  }

  if (path.startsWith(guildSettings)) {
    const breadcrumbs: Breadcrumb[] = [
      guildBreadcrumb,
      { label: t("common.breadcrumbs.settings"), path: null },
    ];

    if (path === guildSettingsRoles) {
      breadcrumbs[1] = {
        label: t("common.breadcrumbs.settings"),
        path: guildSettings,
      };
      breadcrumbs.push({ label: t("common.breadcrumbs.roles"), path: null });
    } else if (path.startsWith(`${guildSettingsRoles}/`)) {
      const roleId = path.split("/").pop();
      breadcrumbs[1] = {
        label: t("common.breadcrumbs.settings"),
        path: guildSettings,
      };
      breadcrumbs.push({
        label: t("common.breadcrumbs.roles"),
        path: guildSettingsRoles,
      });
      breadcrumbs.push({
        label: t("common.breadcrumbs.roleFallback", { id: roleId }),
        path: null,
      });
    } else if (path === guildSettingsMembers) {
      breadcrumbs[1] = {
        label: t("common.breadcrumbs.settings"),
        path: guildSettings,
      };
      breadcrumbs.push({
        label: t("common.breadcrumbs.members"),
        path: null,
      });
    } else if (path === guildSettingsNpcs) {
      breadcrumbs[1] = {
        label: t("common.breadcrumbs.settings"),
        path: guildSettings,
      };
      breadcrumbs.push({ label: "NPCs", path: null });
    }

    return {
      breadcrumbs,
      showBack: true,
      backPath: path === guildSettings ? guildBase : guildSettings,
    };
  }

  return {
    breadcrumbs: [
      { label: guildName || t("common.breadcrumbs.guild"), path: null },
    ],
    showBack: false,
  };
}
