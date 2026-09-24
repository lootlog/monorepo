import { NoticeCard } from "@/components/common/notice-card";
import {
  Ghost,
  KeyRound,
  ShieldAlert,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

type RouteErrorStatus = 401 | 403 | 404 | 500;

type RouteErrorStateProps = {
  status: RouteErrorStatus;
  title?: string;
  description?: string;
  details?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
};

const statusConfig: Record<
  RouteErrorStatus,
  { icon: LucideIcon; color: string }
> = {
  401: { icon: KeyRound, color: "text-blue-500" },
  403: { icon: ShieldAlert, color: "text-amber-500" },
  404: { icon: Ghost, color: "text-slate-500" },
  500: { icon: TriangleAlert, color: "text-red-500" },
};

export const RouteErrorState = ({
  status,
  title,
  description,
  details,
  primaryAction,
  secondaryAction,
}: RouteErrorStateProps) => {
  const { t } = useTranslation();
  const { icon: Icon, color } = statusConfig[status];

  return (
    <NoticeCard
      headingLevel="h1"
      icon=<Icon className={`size-8 ${color}`} aria-hidden="true" />
      title={title ?? t(`common.routeErrors.status.${status}.title`)}
      description={
        description ?? t(`common.routeErrors.status.${status}.description`)
      }
      meta={
        <p className="mt-3 text-xs font-medium tabular-nums text-muted-foreground">
          {t("common.routeErrors.code", { status })}
        </p>
      }
    >
      {(primaryAction ?? secondaryAction) && (
        <div className="flex flex-col gap-2 [&>*]:w-full">
          {primaryAction}
          {secondaryAction}
        </div>
      )}
      {details && (
        <details className="mt-4 text-left text-sm">
          <summary className="cursor-pointer rounded-sm text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring">
            {t("common.routeErrors.details")}
          </summary>
          <p className="mt-2 whitespace-pre-wrap break-words text-muted-foreground">
            {details}
          </p>
        </details>
      )}
    </NoticeCard>
  );
};
