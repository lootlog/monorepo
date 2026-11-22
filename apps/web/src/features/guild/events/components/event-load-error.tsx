import { RouteErrorState } from "@/components/router/route-error-state";
import { RouteRetryButton } from "@/components/router/route-retry-button";
import { normalizeRouteErrorStatus } from "@/lib/router/route-errors";
import { getApiErrorStatus } from "@lootlog/client/transport";
import { Button } from "@lootlog/ui/components/button";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

type EventLoadErrorBack =
  | { backTo: "none" }
  | { backTo: "list" }
  | { backTo: "event"; eventId: string }
  | { backTo: "hero"; eventId: string; heroId: string };

type EventLoadErrorProps = EventLoadErrorBack & {
  guildId: string;
  error?: unknown;
  status?: 403 | 404 | 500;
  titles?: Partial<Record<403 | 404 | 500, string>>;
  onRetry?: () => Promise<object>;
};

const TITLE_KEYS = {
  403: "events.accessDenied",
  404: "events.loadError.notFound",
  500: "events.loadError.title",
} as const;

export const EventLoadError = (props: EventLoadErrorProps) => {
  const { t } = useTranslation();
  const { guildId, error, titles, onRetry } = props;

  const status =
    props.status ?? normalizeRouteErrorStatus(getApiErrorStatus(error));

  const backLink = (() => {
    switch (props.backTo) {
      case "hero":
        return (
          <Link
            to="/$guildId/events/$eventId/heroes/$heroId"
            params={{ guildId, eventId: props.eventId, heroId: props.heroId }}
          >
            {t("events.common.backToHero")}
          </Link>
        );
      case "event":
        return (
          <Link
            to="/$guildId/events/$eventId"
            params={{ guildId, eventId: props.eventId }}
          >
            {t("events.common.backToEvent")}
          </Link>
        );
      case "list":
        return (
          <Link to="/$guildId/events" params={{ guildId }}>
            {t("events.backToList")}
          </Link>
        );
      case "none":
        return null;
    }
  })();

  return (
    <RouteErrorState
      status={status}
      title={
        status === 401 ? undefined : (titles?.[status] ?? t(TITLE_KEYS[status]))
      }
      primaryAction={
        onRetry && status === 500 ? (
          <RouteRetryButton
            onRetry={async () => {
              await onRetry();
            }}
          />
        ) : undefined
      }
      secondaryAction={
        backLink ? (
          <Button variant="outline" render={backLink} nativeButton={false} />
        ) : undefined
      }
    />
  );
};
