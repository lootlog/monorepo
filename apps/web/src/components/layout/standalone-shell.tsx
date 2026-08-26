import { PageHeader } from "@/components/layout/page-header";
import { ROUTES } from "@/config/routes";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Link2 } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

type StandaloneShellProps = {
  children: ReactNode;
};

export const StandaloneShell = ({ children }: StandaloneShellProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col bg-background">
      <PageHeader>
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="size-9 px-0 sm:w-auto sm:px-3"
            aria-label={t("common.routeErrors.actions.goToDashboard")}
            onClick={() => navigate({ to: ROUTES.user.dashboard })}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">
              {t("common.routeErrors.actions.goToDashboard")}
            </span>
          </Button>
          <div className="h-5 w-px bg-border" aria-hidden="true" />
          <div className="flex min-w-0 items-center gap-2 px-1">
            <Link2
              className="size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span className="truncate text-sm font-semibold">
              {t("reservations.sharing.standaloneTitle")}
            </span>
          </div>
        </div>
      </PageHeader>
      <ScrollArea className="min-h-0 flex-1 [&>[data-radix-scroll-area-viewport]>div]:!h-full [&>[data-radix-scroll-area-viewport]>div]:!w-full">
        <main className="flex min-h-full w-full items-center justify-center px-3 py-6 sm:px-6 sm:py-10">
          {children}
        </main>
      </ScrollArea>
    </div>
  );
};
