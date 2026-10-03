import { EmptyState } from "@/components/common/empty-state";
import { ResultsSurface } from "@/components/common/results-surface";
import { SearchInput } from "@/components/ui/search-input";
import { Button } from "@lootlog/ui/components/button";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { FilterX, type LucideIcon } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { useTranslation } from "react-i18next";

type SettingsTableCardProps = {
  /** Names the page for assistive technology; the settings tabs name it visually. */
  title: string;
  search: {
    value: string;
    placeholder: string;
    onChange: (value: string) => void;
  };
  /** Filters and actions that follow the search input. */
  toolbarEnd?: ReactNode;
  isEmpty: boolean;
  empty: {
    icon: LucideIcon;
    title: string;
    description: string;
  };
  /** Offers the reset action in the empty state while any filter narrows the list. */
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  footer?: ReactNode;
  /** The scroll viewport, for tables that virtualize their rows. */
  scrollRef?: Ref<HTMLDivElement>;
  children: ReactNode;
};

/** The searchable list shared by the role, monster and member settings tabs. */
export const SettingsTableCard = ({
  title,
  search,
  toolbarEnd,
  isEmpty,
  empty,
  hasActiveFilters,
  onResetFilters,
  footer,
  scrollRef,
  children,
}: SettingsTableCardProps) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 px-3 pb-3">
      <h1 className="sr-only">{title}</h1>
      <ResultsSurface
        toolbarLabel={t("settings.filtersLabel")}
        toolbarEnd={
          <>
            <SearchInput
              value={search.value}
              onChange={(event) => search.onChange(event.target.value)}
              placeholder={search.placeholder}
              aria-label={search.placeholder}
              wrapperClassName="h-10 w-full min-w-0 sm:min-w-[200px] sm:flex-1"
            />
            {toolbarEnd}
          </>
        }
        footer={footer}
        scrollRef={scrollRef}
        withHorizontalScroll={!isMobile}
      >
        {isEmpty ? (
          <EmptyState
            className="min-h-80"
            icon={empty.icon}
            title={empty.title}
            description={empty.description}
            action={
              hasActiveFilters && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onResetFilters}
                >
                  <FilterX data-icon="inline-start" aria-hidden />
                  {t("settings.resetFilters")}
                </Button>
              )
            }
          />
        ) : (
          children
        )}
      </ResultsSurface>
    </div>
  );
};
