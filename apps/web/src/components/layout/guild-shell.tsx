import { AppContentFrame } from "./app-content-frame";
import { GuildBreadcrumbs } from "@/components/layout/guild-breadcrumbs";
import { AppTopBar } from "@/components/layout/app-top-bar";
import { SidebarTrigger } from "@lootlog/ui/components/sidebar";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";

type GuildShellProps = {
  children: ReactNode;
  variant: "ready" | "fallback";
};

export const GuildShell: FC<GuildShellProps> = ({ children, variant }) => {
  const { t } = useTranslation();

  return (
    <AppContentFrame
      header={
        variant === "ready" ? (
          <GuildBreadcrumbs />
        ) : (
          <AppTopBar>
            <div className="flex items-center gap-2">
              <SidebarTrigger className="size-8!" />
              <span className="text-sm font-bold text-primary">
                {t("common.routeErrors.guildShellTitle")}
              </span>
            </div>
          </AppTopBar>
        )
      }
    >
      {children}
    </AppContentFrame>
  );
};
