import { AppContentFrame } from "./app-content-frame";
import { GuildBreadcrumbs } from "@/components/layout/guild-breadcrumbs";
import { AppTopBar } from "@/components/layout/app-top-bar";
import { SidebarTrigger } from "@lootlog/ui/components/sidebar";
import { HeaderSlotsContext } from "@/contexts/header-slots-context";
import { useHeaderSlotTargets } from "@/hooks/use-header-slot-targets";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";

type GuildShellProps = {
  children: ReactNode;
  /** `failed` drops the placeholder title: the error card names the problem. */
  variant: "ready" | "fallback" | "failed";
};

export const GuildShell: FC<GuildShellProps> = ({ children, variant }) => {
  const { t } = useTranslation();

  const { slots, contextRef, actionsRef } = useHeaderSlotTargets();

  return (
    <HeaderSlotsContext.Provider value={slots}>
      <AppContentFrame
        header={
          variant === "ready" ? (
            <GuildBreadcrumbs contextRef={contextRef} actionsRef={actionsRef} />
          ) : (
            <AppTopBar>
              <div className="flex items-center gap-2">
                <SidebarTrigger className="md:hidden" />
                {variant === "fallback" ? (
                  <span className="text-sm font-bold text-primary">
                    {t("common.routeErrors.guildShellTitle")}
                  </span>
                ) : null}
              </div>
            </AppTopBar>
          )
        }
      >
        {children}
      </AppContentFrame>
    </HeaderSlotsContext.Provider>
  );
};
