import { getApiErrorStatus } from "@lootlog/client/transport";
import { Button } from "@lootlog/ui/components/button";
import { Link } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EventReadError } from "../shared/event-read-error";

type KillDetailLoadErrorProps = {
  error: Error | null;
  guildId: string;
  eventId: string;
  heroId: string;
  onRetry: () => void;
  isRetrying: boolean;
};

export function getKillDetailErrorKind(error: Error | null) {
  const status = getApiErrorStatus(error);

  if (status === 404) return "not-found";

  if (status === 401 || status === 403) return "access-denied";

  return "failure";
}

export const KillDetailLoadError = ({
  error,
  guildId,
  eventId,
  heroId,
  onRetry,
  isRetrying,
}: KillDetailLoadErrorProps) => {
  const { t } = useTranslation();
  const kind = getKillDetailErrorKind(error);

  return (
    <div className="flex h-64 flex-col items-center justify-center gap-4 px-4 text-center">
      {kind !== "failure" ? (
        <>
          <AlertCircle className="size-10 text-destructive" />
          <p className="text-sm text-muted-foreground">
            {t(
              kind === "not-found"
                ? "events.killDetail.notFound"
                : "events.killDetail.accessDenied",
            )}
          </p>
        </>
      ) : (
        <EventReadError
          message={t("events.killDetail.error")}
          onRetry={onRetry}
          isRetrying={isRetrying}
        />
      )}
      <Button
        variant="outline"
        render={
          <Link
            to="/$guildId/events/$eventId/heroes/$heroId"
            params={{ guildId, eventId, heroId }}
          >
            {t("events.common.backToHero")}
          </Link>
        }
        nativeButton={false}
      />
    </div>
  );
};
