import type React from "react";
import { useTranslation } from "react-i18next";
import { Loader2, RotateCcw } from "lucide-react";
import { useDelayedVisibility } from "@/hooks/ui/use-delayed-visibility";
import { Button } from "@/components/ui/button";

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
  errorMessage?: string;
  isLoading?: boolean;
  loadingMessage?: string;
  onRetry?: () => void;
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
  errorMessage,
  isLoading = false,
  loadingMessage,
  onRetry,
}: AutocompleteSuggestionsProps<T>) => {
  const { t } = useTranslation("common");
  const showLoading = useDelayedVisibility(isLoading);
  const hasResults = items.length > 0;
  const resolvedNoResultsMessage =
    noResultsMessage ?? t("autocomplete.noResults");

  if (isLoading) {
    if (!showLoading) {
      return null;
    }

    return (
      <div
        className={`ll:absolute ll:z-50 ll:mt-1 ll:flex ll:w-full ll:items-center ll:justify-center ll:gap-2 ll:rounded-sm ll:border ll:border-gray-400 ll:bg-black/95 ll:px-3 ll:py-2 ll:text-xs ll:text-gray-300 ${className}`}
        role="status"
      >
        <Loader2
          aria-hidden
          className="ll:size-3.5 ll:animate-spin ll:motion-reduce:animate-none"
        />
        {loadingMessage ?? t("async.loading")}
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div
        className={`ll:absolute ll:z-50 ll:mt-1 ll:flex ll:w-full ll:items-center ll:justify-center ll:gap-2 ll:rounded-sm ll:border ll:border-red-500/60 ll:bg-black/95 ll:px-3 ll:py-2 ll:text-xs ll:text-red-200 ${className}`}
        role="alert"
      >
        <span>{errorMessage}</span>
        {onRetry ? (
          <Button
            aria-label={t("actions.retry")}
            className="ll:size-5 ll:p-0"
            onClick={onRetry}
            type="button"
            variant="ghost"
          >
            <RotateCcw aria-hidden className="ll:size-3" />
          </Button>
        ) : null}
      </div>
    );
  }

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
