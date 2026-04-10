import { Card } from "@lootlog/ui/components/card";
import { AlertCircle, Ban, Lock, SearchX } from "lucide-react";
import type { ReactNode } from "react";

type RouteErrorStateProps = {
  status: 401 | 403 | 404 | 500;
  title: string;
  description: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
};

const iconByStatus = {
  401: Lock,
  403: Ban,
  404: SearchX,
  500: AlertCircle,
} as const;

const accentByStatus = {
  401: "bg-blue-500/10 text-blue-500 shadow-blue-500/10",
  403: "bg-amber-500/10 text-amber-500 shadow-amber-500/10",
  404: "bg-slate-500/10 text-slate-500 shadow-slate-500/10",
  500: "bg-red-500/10 text-red-500 shadow-red-500/10",
} as const;

export const RouteErrorState = ({
  status,
  title,
  description,
  primaryAction,
  secondaryAction,
}: RouteErrorStateProps) => {
  const Icon = iconByStatus[status];

  return (
    <div className="flex h-full min-h-0 items-center justify-center p-4">
      <Card className="w-full max-w-xl gap-4 border-border bg-card/60 p-6 backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <div
            className={`rounded-2xl p-3 shadow-inner ${accentByStatus[status]}`}
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {status}
            </div>
            <h2 className="mt-1 text-xl font-semibold leading-tight">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        {(primaryAction ?? secondaryAction) && (
          <div className="flex flex-wrap items-center gap-2">
            {primaryAction}
            {secondaryAction}
          </div>
        )}
      </Card>
    </div>
  );
};
