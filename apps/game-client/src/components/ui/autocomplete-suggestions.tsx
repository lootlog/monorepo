import type React from "react";
import { useTranslation } from "react-i18next";
import { Loader2, RotateCcw } from "lucide-react";
import { cn } from "cn";
import { useDelayedVisibility } from "@/hooks/ui/use-delayed-visibility";
import { IconButton } from "@/components/ui/icon-button";

export const SUGGESTIONS_PANEL_CLASS_NAME =
  "ll:z-50 ll:w-full ll:border ll:border-solid ll:border-separator ll:bg-black/95";

export const SUGGESTIONS_STATUS_CLASS_NAME =
  "ll:m-0 ll:flex ll:items-center ll:justify-center ll:gap-2 ll:px-3 ll:py-2 ll:text-center ll:text-xs ll:text-muted-foreground";

export const getSuggestionOptionClassName = (isSelected: boolean) =>
  cn(
    "ll:w-full ll:appearance-none ll:rounded-none ll:border-0 ll:text-left ll:text-xs ll:text-foreground ll:focus-visible:outline-2 ll:focus-visible:-outline-offset-2 ll:focus-visible:outline-ring ll-custom-cursor-pointer",
    isSelected ? "ll:bg-primary/15" : "ll:bg-transparent ll:hover:bg-white/5",
  );

interface AutocompleteSuggestionsProps<T> {
  items: T[];
  isOpen: boolean;
  onSelect: (item: T) => void;
  selectedIndex: number;
  renderItem: (item: T) => React.ReactNode;
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
  className,
  errorMessage,
  isLoading = false,
  loadingMessage,
  onRetry,
}: AutocompleteSuggestionsProps<T>) => {
  const { t } = useTranslation("common");
  const showLoading = useDelayedVisibility(isLoading);
  const hasResults = items.length > 0;

  const panelClassName = cn(
    SUGGESTIONS_PANEL_CLASS_NAME,
    "ll:absolute ll:mt-1 ll:rounded-sm",
    className,
  );

  if (isLoading) {
    if (!showLoading) {
      return null;
    }

    return (
      <div
        className={cn(panelClassName, SUGGESTIONS_STATUS_CLASS_NAME)}
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
        className={cn(
          panelClassName,
          SUGGESTIONS_STATUS_CLASS_NAME,
          "ll:border-destructive/60 ll:text-destructive",
        )}
        role="alert"
      >
        <span>{errorMessage}</span>
        {onRetry ? (
          <IconButton label={t("actions.retry")} onClick={onRetry}>
            <RotateCcw aria-hidden />
          </IconButton>
        ) : null}
      </div>
    );
  }

  if (!isOpen && !showNoResults) {
    return null;
  }

  if (showNoResults && !hasResults) {
    return (
      <div className={panelClassName}>
        <p className={SUGGESTIONS_STATUS_CLASS_NAME}>
          {noResultsMessage ?? t("autocomplete.noResults")}
        </p>
      </div>
    );
  }

  if (isOpen && hasResults) {
    return (
      <div className={cn(panelClassName, "ll:max-h-48 ll:overflow-y-auto")}>
        {items.map((item, index) => (
          <button
            type="button"
            key={keyExtractor(item)}
            onClick={() => onSelect(item)}
            className={cn(
              getSuggestionOptionClassName(index === selectedIndex),
              "ll:block ll:border-b ll:border-solid ll:border-separator-subtle ll:px-2 ll:py-1.5 ll:last:border-b-0",
            )}
          >
            {renderItem(item)}
          </button>
        ))}
      </div>
    );
  }

  return null;
};
