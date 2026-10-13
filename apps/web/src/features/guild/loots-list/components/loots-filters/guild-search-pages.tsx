import { CommandGroup, CommandItem } from "@lootlog/ui/components/command";
import { useTranslation } from "react-i18next";
import { APP_NAVIGATION_ICONS } from "@/navigation/app-navigation-icons";
import { SEARCH_ROW_CLASS_NAME } from "./loot-search-presentation";
import { SearchRowEnterHint } from "./search-row-enter-hint";
import type { GuildSearchPage } from "./use-loot-search-command";

type GuildSearchPagesProps = {
  pages: GuildSearchPage[];
  onSelect: (page: GuildSearchPage) => void;
};

export const GuildSearchPages = ({
  pages,
  onSelect,
}: GuildSearchPagesProps) => {
  const { t } = useTranslation();

  return (
    <CommandGroup heading={t("loots.searchCommand.pages")}>
      {pages.map((page) => {
        const Icon = APP_NAVIGATION_ICONS[page.id];

        return (
          <CommandItem
            key={page.id}
            value={`page-${page.id}`}
            onSelect={() => onSelect(page)}
            className={SEARCH_ROW_CLASS_NAME}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary">
              <Icon aria-hidden="true" className="size-4!" />
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">
              {page.label}
            </span>
            <SearchRowEnterHint />
          </CommandItem>
        );
      })}
    </CommandGroup>
  );
};
