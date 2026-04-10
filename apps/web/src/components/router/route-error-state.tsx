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
  401: "border-blue-500/20 bg-blue-500/10 text-blue-500 shadow-blue-500/10 before:bg-blue-500/8",
  403: "border-amber-500/20 bg-amber-500/10 text-amber-500 shadow-amber-500/10 before:bg-amber-500/8",
  404: "border-slate-500/20 bg-slate-500/10 text-slate-500 shadow-slate-500/10 before:bg-slate-500/8",
  500: "border-red-500/20 bg-red-500/10 text-red-500 shadow-red-500/10 before:bg-red-500/8",
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
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-6 sm:px-6">
      <Card className="relative w-full max-w-2xl overflow-hidden border-border/70 bg-card/70 p-0 shadow-2xl shadow-black/5 backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border/80 to-transparent" />

        <div className="relative flex flex-col items-center gap-5 px-6 py-8 text-center sm:px-10 sm:py-10">
          <div className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground shadow-sm">
            {status}
          </div>

          <div
            className={`relative rounded-[28px] border p-4 shadow-inner before:absolute before:inset-2 before:rounded-[20px] before:content-[''] ${accentByStatus[status]}`}
          >
            <Icon className="relative z-10 size-7" />
          </div>

          <div className="flex max-w-xl flex-col items-center gap-2">
            <h2 className="text-xl font-semibold leading-tight text-foreground sm:text-2xl">
              {title}
            </h2>
            <p className="max-w-lg text-sm leading-6 text-muted-foreground sm:text-[15px]">
              {description}
            </p>
          </div>

          {(primaryAction ?? secondaryAction) && (
            <div className="flex w-full flex-col justify-center gap-2 pt-1 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              {primaryAction}
              {secondaryAction}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
