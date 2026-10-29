import { AppContentFrame } from "@lootlog/ui/components/app-content-frame";
import { AppTopBar } from "@lootlog/ui/components/app-top-bar";
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
    <AppContentFrame
      header={
        <AppTopBar>
          <div className="flex min-w-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-8 px-0 sm:w-auto sm:px-3"
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
        </AppTopBar>
      }
    >
      {/* Pages render their sections straight in the page scroller. */}
      <ScrollArea data-under-top-bar className="min-h-0 flex-1">
        {children}
      </ScrollArea>
    </AppContentFrame>
  );
};
