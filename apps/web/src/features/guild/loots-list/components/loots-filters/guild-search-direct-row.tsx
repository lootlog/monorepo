import { CommandGroup, CommandItem } from "@lootlog/ui/components/command";
import { DatabaseZap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SEARCH_ROW_CLASS_NAME } from "./loot-search-presentation";
import { SearchRowEnterHint } from "./search-row-enter-hint";

type GuildSearchDirectRowProps = {
  term: string;
  onSelect: () => void;
};

/** Matches the raw term in saved loots when the search service misses it. */
export const GuildSearchDirectRow = ({
  term,
  onSelect,
}: GuildSearchDirectRowProps) => {
  const { t } = useTranslation();

  return (
    <CommandGroup heading={t("loots.searchCommand.directSearchGroup")}>
      <CommandItem
        value="direct-search"
        onSelect={onSelect}
        className={SEARCH_ROW_CLASS_NAME}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10">
          <DatabaseZap className="size-4! text-primary" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">
            {t("loots.searchCommand.directSearch", { term })}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {t("loots.searchCommand.directSearchHint")}
          </span>
        </span>
        <SearchRowEnterHint />
      </CommandItem>
    </CommandGroup>
  );
};
