import type React from "react";
import { useTranslation } from "react-i18next";

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
  noResultsMessage,
  showNoResults = false,
  className = "",
}: AutocompleteSuggestionsProps<T>) => {
  const { t } = useTranslation("common");
  const hasResults = items.length > 0;
  const resolvedNoResultsMessage =
    noResultsMessage ?? t("autocomplete.noResults");

  if (!isOpen && !showNoResults) {
    return null;
  }

  if (showNoResults && !hasResults) {
    return (
      <div
        className={`ll:absolute ll:z-50 ll:w-full ll:mt-1 ll:bg-black/95 ll:border ll:border-gray-400 ll:rounded-sm ${className}`}
      >
        <p className="ll:text-xs ll:text-gray-400 ll:text-center ll:px-3 ll:py-2">
          {resolvedNoResultsMessage}
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
