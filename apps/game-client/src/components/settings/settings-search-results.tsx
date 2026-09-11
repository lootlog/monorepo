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
      <p className="ll:m-0 ll:px-2 ll:py-2 ll:text-[11px] ll:text-muted-foreground">
        {emptyLabel}
      </p>
    ) : null}
    {results.map((result, index) => {
      const previousResult = results[index - 1];

      const startsDomain =
        !previousResult || previousResult.categoryId !== result.categoryId;

      const startsSubsection =
        startsDomain || previousResult.subsectionId !== result.subsectionId;

      return (
        <div key={result.controlId}>
          {startsDomain ? (
            <div className="ll:mt-1.5 ll:px-2 ll:text-[11px] ll:font-semibold ll:text-muted-foreground">
              {result.categoryLabel}
            </div>
          ) : null}
          {startsSubsection ? (
            <div className="ll:px-2 ll:pt-0.5 ll:text-[11px] ll:font-semibold ll:text-gray-300">
              {result.subsectionLabel}
            </div>
          ) : null}
          <button
            type="button"
            role="option"
            id={getSettingsSearchOptionId(result.controlId)}
            aria-selected={index === selectedResultIndex}
            onMouseEnter={() => onSelectIndex(index)}
            onClick={() => onOpen(result)}
            className="ll-custom-cursor-pointer ll:mt-px ll:flex ll:w-full ll:items-center ll:rounded-sm ll:border-0 ll:bg-transparent ll:px-2 ll:py-1 ll:text-start ll:text-[11px] ll:leading-4 ll:text-gray-200 ll:hover:bg-accent/60 ll:aria-selected:bg-accent ll:aria-selected:text-foreground"
          >
            <span className="ll:truncate">{result.label}</span>
          </button>
        </div>
      );
    })}
  </div>
);
