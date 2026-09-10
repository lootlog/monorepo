import { useTranslation } from "react-i18next";
import type { SettingsSearchItem } from "@/features/settings/settings-search";

type Props = {
  results: SettingsSearchItem[];
  selectedResultIndex: number;
  onSelectIndex: (index: number) => void;
  onOpen: (result: SettingsSearchItem) => void;
};

export function SettingsSearchResults({
  results,
  selectedResultIndex,
  onSelectIndex,
  onOpen,
}: Props) {
  const { t } = useTranslation();

  return (
    <div
      role="listbox"
      aria-label={t("settings.search.results")}
      className="ll:flex ll:flex-col ll:gap-0.5"
    >
      {results.length === 0 ? (
        <p className="ll:m-0 ll:px-2 ll:py-3 ll:text-[11px] ll:text-gray-400">
          {t("settings.search.empty")}
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
              <div className="ll:mt-2 ll:px-2 ll:text-[10px] ll:font-semibold ll:uppercase ll:text-gray-400">
                {result.categoryLabel}
              </div>
            ) : null}
            {startsSubsection ? (
              <div className="ll:px-2 ll:pt-1 ll:text-[11px] ll:font-semibold ll:text-gray-200">
                {result.subsectionLabel}
              </div>
            ) : null}
            <button
              type="button"
              role="option"
              aria-selected={index === selectedResultIndex}
              onMouseEnter={() => onSelectIndex(index)}
              onClick={() => onOpen(result)}
              className="ll:mt-0.5 ll:w-full ll:rounded-md ll:border-0 ll:bg-transparent ll:px-3 ll:py-1.5 ll:text-left ll:text-[11px] ll:text-white/80 ll-custom-cursor-pointer ll:hover:bg-blue-500/15 ll:aria-selected:bg-blue-500/25 ll:aria-selected:text-white"
            >
              {result.label}
            </button>
          </div>
        );
      })}
    </div>
  );
}
