import type { FC } from "react";
import type { SettingsSearchItem } from "@/features/settings/settings-search";

type SettingsSearchResultsProps = {
  id: string;
  label: string;
  emptyLabel: string;
  results: SettingsSearchItem[];
  selectedResultIndex: number;
  onSelectIndex: (index: number) => void;
  onOpen: (result: SettingsSearchItem) => void;
};

export const getSettingsSearchOptionId = (controlId: string) =>
  `settings-search-option-${controlId}`;

/**
 * Search results grouped by the place they open: one small-caps heading per
 * domain › subsection, then the matching controls as options.
 */
export const SettingsSearchResults: FC<SettingsSearchResultsProps> = ({
  id,
  label,
  emptyLabel,
  results,
  selectedResultIndex,
  onSelectIndex,
  onOpen,
}) => (
  <div
    id={id}
    role="listbox"
    aria-label={label}
    className="ll:flex ll:flex-col ll:gap-px"
  >
    {results.length === 0 ? (
      <p className="ll:m-0 ll:px-2 ll:py-2 ll:text-xs ll:text-muted-foreground">
        {emptyLabel}
      </p>
    ) : null}
    {results.map((result, index) => {
      const previousResult = results[index - 1];

      const startsGroup =
        !previousResult ||
        previousResult.categoryId !== result.categoryId ||
        previousResult.subsectionId !== result.subsectionId;

      const showSubsection =
        result.subsectionLabel &&
        result.subsectionLabel !== result.categoryLabel;

      return (
        <div key={result.controlId}>
          {startsGroup ? (
            <div className="ll:mt-2 ll:mb-0.5 ll:truncate ll:px-2 ll:text-[11px] ll:font-semibold ll:uppercase ll:leading-4 ll:tracking-wide ll:text-muted-foreground ll:first:mt-0">
              {result.categoryLabel}
              {showSubsection ? ` › ${result.subsectionLabel}` : null}
            </div>
          ) : null}
          <button
            type="button"
            role="option"
            id={getSettingsSearchOptionId(result.controlId)}
            aria-selected={index === selectedResultIndex}
            onMouseEnter={() => onSelectIndex(index)}
            onClick={() => onOpen(result)}
            className="ll-custom-cursor-pointer ll:flex ll:w-full ll:items-center ll:rounded-sm ll:border-0 ll:bg-transparent ll:px-2 ll:py-1 ll:text-start ll:text-xs ll:leading-4 ll:text-foreground ll:hover:bg-accent/60 ll:aria-selected:bg-accent ll:aria-selected:text-foreground"
          >
            <span className="ll:truncate">{result.label}</span>
          </button>
        </div>
      );
    })}
  </div>
);
