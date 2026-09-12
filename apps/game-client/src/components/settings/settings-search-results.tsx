import type { FC, ReactNode } from "react";
import {
  findSearchMatchRanges,
  type SettingsSearchItem,
} from "@/features/settings/settings-search";

type SettingsSearchResultsProps = {
  id: string;
  label: string;
  emptyLabel: string;
  query: string;
  results: SettingsSearchItem[];
  selectedResultIndex: number;
  onSelectIndex: (index: number) => void;
  onOpen: (result: SettingsSearchItem) => void;
};

export const getSettingsSearchOptionId = (controlId: string) =>
  `settings-search-option-${controlId}`;

/** Wraps the parts of `text` the query matched in `<mark>`. */
const emphasize = (text: string, query: string): ReactNode => {
  const ranges = findSearchMatchRanges(text, query);

  if (ranges.length === 0) return text;

  const parts: ReactNode[] = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start > cursor) parts.push(text.slice(cursor, range.start));
    parts.push(
      <mark
        key={range.start}
        className="ll:rounded-[2px] ll:bg-primary/25 ll:text-inherit"
      >
        {text.slice(range.start, range.end)}
      </mark>,
    );
    cursor = range.end;
  }

  if (cursor < text.length) parts.push(text.slice(cursor));

  return parts;
};

/**
 * Search results grouped by the place they open: one small-caps heading per
 * domain › subsection, then the matching controls as options with the
 * matched text emphasised and a one-line description underneath.
 */
export const SettingsSearchResults: FC<SettingsSearchResultsProps> = ({
  id,
  label,
  emptyLabel,
  query,
  results,
  selectedResultIndex,
  onSelectIndex,
  onOpen,
}) => (
  <div
    id={id}
    role="listbox"
    aria-label={label}
    className="ll:flex ll:flex-col ll:gap-px ll:pb-1"
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
        <div key={result.controlId} className="ll:flex ll:flex-col ll:gap-px">
          {startsGroup ? (
            <div className="ll:mt-3 ll:mb-1 ll:truncate ll:px-2 ll:text-[11px] ll:font-semibold ll:uppercase ll:leading-4 ll:tracking-wide ll:text-muted-foreground ll:first:mt-0">
              {result.categoryLabel}
              {showSubsection ? (
                <>
                  <span aria-hidden className="ll:mx-1 ll:opacity-60">
                    ›
                  </span>
                  {result.subsectionLabel}
                </>
              ) : null}
            </div>
          ) : null}
          <button
            type="button"
            role="option"
            id={getSettingsSearchOptionId(result.controlId)}
            aria-selected={index === selectedResultIndex}
            aria-label={result.label}
            onMouseEnter={() => onSelectIndex(index)}
            onClick={() => onOpen(result)}
            className="ll-custom-cursor-pointer ll:flex ll:w-full ll:flex-col ll:items-stretch ll:gap-0.5 ll:rounded-sm ll:border-0 ll:bg-transparent ll:px-2 ll:py-1.5 ll:text-start ll:text-foreground ll:transition-colors ll:duration-100 ll:hover:bg-accent/60 ll:aria-selected:bg-accent ll:aria-selected:text-foreground"
          >
            <span className="ll:truncate ll:text-[13px] ll:leading-[18px]">
              {emphasize(result.label, query)}
            </span>
            {result.description ? (
              <span className="ll:truncate ll:text-[11px] ll:leading-4 ll:text-muted-foreground">
                {emphasize(result.description, query)}
              </span>
            ) : null}
          </button>
        </div>
      );
    })}
  </div>
);
