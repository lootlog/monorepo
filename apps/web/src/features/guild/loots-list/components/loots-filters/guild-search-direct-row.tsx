import { CommandGroup, CommandItem } from "@lootlog/ui/components/command";
import { useTranslation } from "react-i18next";
import { SEARCH_ROW_CLASS_NAME } from "./loot-search-presentation";
import { LootSearchHitContent } from "./loot-search-hit-content";
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
        <LootSearchHitContent hit={{ kind: "direct", term }} />
        <SearchRowEnterHint />
      </CommandItem>
    </CommandGroup>
  );
};
