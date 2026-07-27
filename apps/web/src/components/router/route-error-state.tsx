import { Card } from "@lootlog/ui/components/card";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

type RouteErrorStateProps = {
  status: 401 | 403 | 404 | 500;
  description?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
};

const statusConfig = {
  401: { emoji: "🔑", color: "text-blue-500" },
  403: { emoji: "🚧", color: "text-amber-500" },
  404: { emoji: "👻", color: "text-slate-500" },
  500: { emoji: "🔥", color: "text-red-500" },
} as const;

export const RouteErrorState = ({
  status,
  description,
  primaryAction,
  secondaryAction,
}: RouteErrorStateProps) => {
  const { t } = useTranslation();
  const { emoji, color } = statusConfig[status];
  const title = t(`common.routeErrors.status.${status}.title`);
  const stateDescription =
    description ?? t(`common.routeErrors.status.${status}.description`);

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-3 py-3">
      <Card className="w-full max-w-md border-border bg-card">
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl">{emoji}</span>
            <span
              className={`text-2xl font-bold tabular-nums tracking-tight ${color}`}
            >
              {status}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <h2 className="text-base font-semibold leading-tight">{title}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {stateDescription}
            </p>
          </div>

          {(primaryAction ?? secondaryAction) && (
            <div className="flex w-full flex-col justify-center gap-2 pt-4 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              {primaryAction}
              {secondaryAction}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
