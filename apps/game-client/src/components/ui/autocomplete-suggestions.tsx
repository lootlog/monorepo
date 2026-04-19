import type React from "react";
import i18n from "@/i18n/config";

interface AutocompleteSuggestionsProps<T> {
  items: T[];
  isOpen: boolean;
  onSelect: (item: T) => void;
  selectedIndex: number;
  renderItem: (item: T, index: number, isSelected: boolean) => React.ReactNode;
  keyExtractor: (item: T) => string | number;
  noResultsMessage?: string;
  showNoResults?: boolean;
  className?: string;
}

export const AutocompleteSuggestions = <T,>({
  items,
  isOpen,
  onSelect,
  selectedIndex,
  renderItem,
  keyExtractor,
  noResultsMessage = i18n.t("settings.command.suggestions.noResults"),
  showNoResults = false,
  className = "",
}: AutocompleteSuggestionsProps<T>) => {
  const hasResults = items.length > 0;

  if (!isOpen && !showNoResults) {
    return null;
  }

  if (showNoResults && !hasResults) {
    return (
      <div
        className={`ll:absolute ll:z-50 ll:w-full ll:mt-1 ll:bg-black/95 ll:border ll:border-gray-400 ll:rounded-sm ${className}`}
      >
        <p className="ll:text-xs ll:text-gray-400 ll:text-center ll:px-3 ll:py-2">
          {noResultsMessage}
        </p>
      </div>
    );
  }

  if (isOpen && hasResults) {
    return (
      <div
        className={`ll:absolute ll:z-50 ll:w-full ll:mt-1 ll:bg-black/95 ll:border ll:border-gray-400 ll:rounded-sm ll:max-h-48 ll:overflow-y-auto ${className}`}
      >
        {items.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <div
              key={keyExtractor(item)}
              onClick={() => onSelect(item)}
              className="ll:cursor-pointer"
            >
              {renderItem(item, index, isSelected)}
            </div>
          );
        })}
      </div>
    );
  }

  return null;
};
