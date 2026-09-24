import { FullScreenLoading } from "@/components/ui/full-screen-loading";
import { NoticeCard } from "@/components/common/notice-card";
import { RouteErrorState } from "@/components/router/route-error-state";
import { RouteRetryButton } from "@/components/router/route-retry-button";
import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { ROUTES } from "@/config/routes";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGuildsControllerGetGuildById,
  invalidateUsersControllerGetCurrentUserAccessibleGuilds,
} from "@lootlog/client/main";
import { getApiErrorStatus, shouldRetryQuery } from "@lootlog/client/transport";
import { Button } from "@lootlog/ui/components/button";
import { TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { normalizeRouteErrorStatus } from "@/lib/router/route-errors";
import { isReauthenticationError } from "@/lib/api-reauthentication";
import { refreshCurrentUserGuilds } from "@/lib/current-user-guilds";

export const Init: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { guild_id: guildId } = useSearch({ from: "/init" });
  const { t } = useTranslation();
  const [completionFailed, setCompletionFailed] = useState(false);
  const [completionAttempt, setCompletionAttempt] = useState(0);

  const {
    data: guildData,
    error,
    isError,
    isPaused,
    refetch,
  } = useGuildsControllerGetGuildById(
    { guildId: guildId ?? "" },
    {
      query: {
        enabled: Boolean(guildId),
        placeholderData: undefined,
        retry: (failureCount, cause) => {
          if (isReauthenticationError(cause)) return false;

          // Discord's installation callback can arrive before the organization is ready.
          if (getApiErrorStatus(cause) === 404) return failureCount < 2;

          return shouldRetryQuery(failureCount, cause);
        },
      },
    },
  );

  useEffect(() => {
    if (!guildId || !guildData) {
      return;
    }

    let cancelled = false;

    // The API caches the Discord guild list, which may predate the new server.
    void Promise.allSettled([
      invalidateUsersControllerGetCurrentUserAccessibleGuilds(queryClient),
      refreshCurrentUserGuilds(queryClient),
    ])
      .then(async () => {
        if (!cancelled) await navigate({ to: ROUTES.guild.base(guildData.id) });
      })
      .catch(() => {
        if (!cancelled) setCompletionFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [guildData, guildId, navigate, queryClient, completionAttempt]);

  const dashboardAction = (
    <Button
      variant="outline"
      className="w-full"
      onClick={() => void navigate({ to: ROUTES.user.dashboard })}
    >
      {t("common.routeErrors.actions.goToDashboard")}
    </Button>
  );

  if (!guildId) {
    return (
      <div className="flex min-h-dvh bg-background">
        <NoticeCard
          headingLevel="h1"
          icon=<TriangleAlert
            className="size-8 text-amber-500"
            aria-hidden="true"
          />
          title={t("common.init.missingGuild.title")}
          description={t("common.init.missingGuild.description")}
        >
          {dashboardAction}
        </NoticeCard>
      </div>
    );
  }

  if (isError || isPaused || completionFailed) {
    const requiresSignIn = isReauthenticationError(error);

    const failureDescription = t(
      isPaused
        ? "common.init.offline.description"
        : "common.init.failed.description",
    );

    return (
      <div className="flex min-h-dvh bg-background">
        <RouteErrorState
          status={
            requiresSignIn
              ? 401
              : normalizeRouteErrorStatus(getApiErrorStatus(error))
          }
          title={requiresSignIn ? undefined : t("common.init.failed.title")}
          description={requiresSignIn ? undefined : failureDescription}
          primaryAction=<RouteRetryButton
            onRetry={async () => {
              if (completionFailed) {
                setCompletionFailed(false);
                setCompletionAttempt((attempt) => attempt + 1);

                return;
              }

              await refetch();
            }}
          />
          secondaryAction={
            requiresSignIn ? (
              <Button
                variant="outline"
                onClick={() =>
                  void navigate({
                    to: ROUTES.signin,
                    search: {
                      redirect: `${ROUTES.init}?guild_id=${encodeURIComponent(guildId)}`,
                    },
                  })
                }
              >
                {t("common.routeErrors.actions.goToSignIn")}
              </Button>
            ) : (
              dashboardAction
            )
          }
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <FullScreenLoading />
    </div>
  );
};
