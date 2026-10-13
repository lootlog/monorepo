import { useEffect, useState, type PropsWithChildren } from "react";
import { useMatches } from "@tanstack/react-router";
import { Capability } from "@lootlog/domain/access-policy";
import { GuildSearchContext } from "@/contexts/guild-search-context";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { resolveAppNavigation } from "@/navigation/app-navigation";
import { LootSearchCommand } from "@/features/guild/loots-list/components/loots-filters/loot-search-command";
import { GuildSearchButton } from "./guild-search-button";
import { HeaderSlotPortal } from "./header-slot-portal";

/** The Organization search palette: header button, the shortcut, and its state. */
export const GuildSearch = ({ children }: PropsWithChildren) => {
  const [open, setOpen] = useState(false);
  const { data: accessPolicy } = useGuildPermissions();
  const matches = useMatches();

  const pages = resolveAppNavigation({ matches, accessPolicy })
    .sidebarItems.filter((item) => item.visible)
    .map(({ id, label, href }) => ({ id, label, href }));

  // The loot API enforces access; until the policy loads the palette offers
  // loot search, like the sidebar offers the loot list.
  const canSearchLoots =
    accessPolicy?.allows(Capability.LOOTLOG_LOOTS_READ) ?? true;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <GuildSearchContext.Provider value={setOpen}>
      {children}
      <HeaderSlotPortal slot="actions">
        <GuildSearchButton onClick={() => setOpen(true)} />
      </HeaderSlotPortal>
      <LootSearchCommand
        open={open}
        onOpenChange={setOpen}
        pages={pages}
        canSearchLoots={canSearchLoots}
      />
    </GuildSearchContext.Provider>
  );
};
