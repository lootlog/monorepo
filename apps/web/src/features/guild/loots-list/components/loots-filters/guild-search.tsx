import { Capability } from "@lootlog/schema/permissions";
import { useContext, useEffect } from "react";
import { useMatches } from "@tanstack/react-router";
import { GuildSearchContext } from "@/contexts/guild-search-context";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { resolveAppNavigation } from "@/navigation/app-navigation";
import { LootSearchCommand } from "./loot-search-command";

export const GuildSearch = () => {
  const { isOpen, setIsOpen } = useContext(GuildSearchContext);
  const { data: accessPolicy } = useGuildPermissions();
  const matches = useMatches();

  const pages = resolveAppNavigation({ matches, accessPolicy })
    .sidebarItems.filter((item) => item.visible)
    .map(({ id, label, href }) => ({ id, label, href }));

  const canSearchLoots =
    accessPolicy?.allows(Capability.LOOTLOG_LOOTS_READ) ?? true;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setIsOpen((current) => !current);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [setIsOpen]);

  return (
    <LootSearchCommand
      open={isOpen}
      onOpenChange={setIsOpen}
      pages={pages}
      canSearchLoots={canSearchLoots}
    />
  );
};
