import { PageHeader } from "@/components/common/page-header";
import { SectionCardFooter } from "@/components/common/section-card/section-card-footer";
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
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-3 py-3 [align-items:safe_center]">
      <PageHeader
        className="w-full max-w-md"
        title={title}
        description={stateDescription}
        status={
          <span className={`text-sm font-semibold tabular-nums ${color}`}>
            {emoji} {status}
          </span>
        }
      >
        {(primaryAction ?? secondaryAction) && (
          <SectionCardFooter>
            {primaryAction}
            {secondaryAction}
          </SectionCardFooter>
        )}
      </PageHeader>
    </div>
  );
};
