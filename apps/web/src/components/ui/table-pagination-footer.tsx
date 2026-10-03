import type { ReactNode } from "react";
import { Button } from "@lootlog/ui/components/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

type TablePaginationFooterProps = {
  totalLabel: ReactNode;
  hasPrev: boolean;
  hasNext: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
};

export const TablePaginationFooter = ({
  totalLabel,
  hasPrev,
  hasNext,
  onPreviousPage,
  onNextPage,
}: TablePaginationFooterProps) => {
  const { t } = useTranslation();

  return (
    <div className="h-14 shrink-0 border-t border-border py-4 flex items-center justify-between px-4">
      <div className="text-sm text-muted-foreground whitespace-nowrap">
        {totalLabel}
      </div>
      <nav aria-label={t("common.pagination.label")}>
        <ul className="flex flex-row items-center gap-1">
          <li>
            <Button
              variant="ghost"
              className="group/page gap-1 px-2.5"
              aria-label={t("common.pagination.previousPage")}
              disabled={!hasPrev}
              onClick={onPreviousPage}
            >
              <ChevronLeft
                aria-hidden="true"
                className="transition-[translate] duration-150 ease-emphasized group-hover/page:-translate-x-0.5 motion-reduce:transition-none"
              />
              <span className="hidden sm:block">
                {t("common.pagination.previous")}
              </span>
            </Button>
          </li>
          <li>
            <Button
              variant="ghost"
              className="group/page gap-1 px-2.5"
              aria-label={t("common.pagination.nextPage")}
              disabled={!hasNext}
              onClick={onNextPage}
            >
              <span className="hidden sm:block">
                {t("common.pagination.next")}
              </span>
              <ChevronRight
                aria-hidden="true"
                className="transition-[translate] duration-150 ease-emphasized group-hover/page:translate-x-0.5 motion-reduce:transition-none"
              />
            </Button>
          </li>
        </ul>
      </nav>
    </div>
  );
};
