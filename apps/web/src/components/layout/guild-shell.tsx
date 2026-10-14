import { AppContentFrame } from "./app-content-frame";
import { GuildNavigationTopBar } from "@/components/layout/guild-navigation-top-bar";
import { AppTopBar } from "@/components/layout/app-top-bar";
import { SidebarTrigger } from "@lootlog/ui/components/sidebar";
import { GuildSearchContext } from "@/contexts/guild-search-context";
import { HeaderSlotsContext } from "@/contexts/header-slots-context";
import { useHeaderSlotTargets } from "@/hooks/use-header-slot-targets";
import { useState, type FC, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

type GuildShellProps = {
  children: ReactNode;
  /** `failed` drops the placeholder title: the error card names the problem. */
  variant: "ready" | "fallback" | "failed";
};

export const GuildShell: FC<GuildShellProps> = ({ children, variant }) => {
  const { t } = useTranslation();

  const { slots, titleRef, actionsRef, contextRef } = useHeaderSlotTargets();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <GuildSearchContext.Provider
      value={{ isOpen: isSearchOpen, setIsOpen: setIsSearchOpen }}
    >
      <HeaderSlotsContext.Provider value={slots}>
        <AppContentFrame
          header={
            variant === "ready" ? (
              <GuildNavigationTopBar
                titleRef={titleRef}
                actionsRef={actionsRef}
                contextRef={contextRef}
              />
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
    </GuildSearchContext.Provider>
  );
};
