"use client";

import { useDocsSearch } from "fumadocs-core/search/client";
import { oramaStaticClient } from "fumadocs-core/search/client/orama-static";
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogFooter,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
} from "fumadocs-ui/components/dialog/search";

const searchClient = oramaStaticClient();

export function DocsSearchDialog(props: SharedProps) {
  const { search, setSearch, query } = useDocsSearch({
    client: searchClient,
  });

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      isLoading={query.isLoading}
      {...props}
    >
      <SearchDialogOverlay className="docs-search-overlay" />
      <SearchDialogContent className="docs-search-dialog">
        <SearchDialogHeader className="docs-search-header">
          <SearchDialogIcon />
          <SearchDialogInput autoFocus />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList
          className="docs-search-results"
          items={query.data !== "empty" ? query.data : null}
        />
        <SearchDialogFooter className="docs-search-footer">
          <span>↑↓ wybierz</span>
          <span>Enter otwórz</span>
          <span>Esc zamknij</span>
        </SearchDialogFooter>
      </SearchDialogContent>
    </SearchDialog>
  );
}
