import { useTranslation } from "react-i18next";
import type { SearchTimersNpcResponseDtoOutput } from "@lootlog/client/main";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AutocompleteSuggestions } from "@/components/ui/autocomplete-suggestions";
import type { useAddTimerForm } from "@/features/timers/hooks/use-add-timer-form";
import { NpcSearchSuggestion } from "./npc-search-suggestion";

type NpcSearchFieldProps = {
  npcSearch: ReturnType<typeof useAddTimerForm>["npcSearch"];
};

export function NpcSearchField({ npcSearch }: NpcSearchFieldProps) {
  const { t } = useTranslation("timers");

  return (
    <div className="ll:relative ll:w-full">
      <Label htmlFor="npcSearch">{t("addForm.searchNpcLabel")}</Label>
      <Input
        id="npcSearch"
        autoComplete="off"
        placeholder={t("addForm.searchNpcPlaceholder")}
        value={npcSearch.query}
        onChange={(event) => {
          npcSearch.clearSelectedNpc();
          npcSearch.handleQueryChange(event.target.value);
        }}
        onKeyDown={(event) => npcSearch.handleKeyDown(event, npcSearch.select)}
        onBlur={npcSearch.handleBlur}
      />
      <AutocompleteSuggestions<SearchTimersNpcResponseDtoOutput>
        items={npcSearch.results}
        errorMessage={
          npcSearch.showSuggestions && npcSearch.isFailed
            ? t("addForm.npcSearchError")
            : undefined
        }
        isLoading={npcSearch.showSuggestions && npcSearch.isLoading}
        isOpen={npcSearch.showSuggestions && npcSearch.hasResults}
        loadingMessage={t("addForm.npcSearching")}
        onRetry={npcSearch.retry}
        onSelect={npcSearch.select}
        selectedIndex={npcSearch.selectedIndex}
        keyExtractor={(npc) => npc.npcId}
        renderItem={(npc, _index, isSelected) => (
          <NpcSearchSuggestion npc={npc} isSelected={isSelected} />
        )}
        noResultsMessage={t("addForm.npcNotFound")}
        showNoResults={npcSearch.showNoResults}
      />
    </div>
  );
}
