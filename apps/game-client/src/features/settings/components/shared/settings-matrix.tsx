import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "cn";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  createContext,
  useLayoutEffect,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from "react";

export type SettingsMatrixColumn = {
  key: string;
  label: string;
  icon: LucideIcon;
  description: string;
  primary?: boolean;
  bulk?: {
    checked: boolean;
    onChange: (checked: boolean) => void;
  };
};

export const SettingsMatrixHoveredColumnContext = createContext<number | null>(
  null,
);

type SettingsMatrixProps = {
  label: string;
  rowHeader: string;
  columns: readonly SettingsMatrixColumn[];
  children: ReactNode;
  className?: string;
};

const readColumnIndex = (event: { target: EventTarget }) => {
  const target = event.target;

  if (!(target instanceof Element)) return null;

  const cell = target.closest<HTMLElement>("[data-matrix-column]");

  if (!cell) return null;
  const index = Number(cell.dataset.matrixColumn);

  return Number.isNaN(index) ? null : index;
};

export const SettingsMatrix: FC<SettingsMatrixProps> = ({
  label,
  rowHeader,
  columns,
  children,
  className,
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const rowHeaderRef = useRef<HTMLTableCellElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [labelledWidth, setLabelledWidth] = useState<number | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);

  const compact =
    containerWidth !== null &&
    labelledWidth !== null &&
    containerWidth < labelledWidth;

  useLayoutEffect(() => {
    const container = containerRef.current;

    if (!container) return;
    setContainerWidth(container.clientWidth);

    const observer = new ResizeObserver(([entry]) => {
      if (entry) setContainerWidth(entry.contentRect.width);
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const table = tableRef.current;
    const rowHeader = rowHeaderRef.current;

    if (compact || !table || !rowHeader) return;
    table.style.width = "max-content";
    rowHeader.style.width = "auto";
    setLabelledWidth(table.offsetWidth);
    table.style.width = "";
    rowHeader.style.width = "";
  }, [compact, columns]);

  return (
    <TooltipProvider delayDuration={150}>
      <div
        ref={containerRef}
        className={cn(
          "ll:relative ll:w-full ll:overflow-x-auto ll:rounded-sm ll:bg-black/25",
          className,
        )}
      >
        <table
          ref={tableRef}
          aria-label={label}
          data-compact={compact ? "true" : undefined}
          className="ll:w-full ll:border-collapse ll:text-[13px]"
          onMouseOver={(event) => setHoveredColumn(readColumnIndex(event))}
          onMouseLeave={() => setHoveredColumn(null)}
          onFocus={(event) => setHoveredColumn(readColumnIndex(event))}
          onBlur={() => setHoveredColumn(null)}
        >
          <thead>
            <tr className="ll:border-0 ll:border-b ll:border-solid ll:border-border">
              <th
                ref={rowHeaderRef}
                scope="col"
                className={cn(
                  "ll:px-2 ll:py-2 ll:text-left ll:align-middle ll:text-[11px] ll:font-semibold ll:uppercase ll:leading-4 ll:tracking-wide ll:text-muted-foreground",
                  !compact && "ll:w-full",
                )}
              >
                {rowHeader}
              </th>
              {columns.map((column, index) => (
                <th
                  key={column.key}
                  scope="col"
                  data-matrix-column={index}
                  onClick={
                    column.bulk
                      ? () => column.bulk?.onChange(!column.bulk.checked)
                      : undefined
                  }
                  className={cn(
                    "ll:px-1 ll:py-2 ll:text-center ll:align-middle ll:font-normal ll:transition-colors",
                    column.primary &&
                      "ll:border-0 ll:border-e ll:border-solid ll:border-border",
                    compact ? "ll:min-w-12" : "ll:min-w-[92px]",
                    hoveredColumn === index && "ll:bg-white/5",
                  )}
                >
                  <Tooltip>
                    <TooltipTrigger className="ll-custom-cursor-pointer ll:flex ll:h-full ll:w-full ll:flex-col ll:items-center ll:justify-center ll:gap-1 ll:border-0 ll:bg-transparent ll:p-0 ll:text-xs ll:leading-4 ll:font-semibold ll:text-foreground ll:focus-visible:outline-2 ll:focus-visible:-outline-offset-2 ll:focus-visible:outline-ring">
                      <column.icon
                        aria-hidden
                        className="ll:size-3.5 ll:text-muted-foreground"
                      />
                      <span
                        className={cn(
                          "ll:text-balance",
                          compact && "ll:sr-only",
                        )}
                      >
                        {column.label}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="ll:max-w-56">
                      {column.description}
                      {column.bulk ? (
                        <span className="ll:mt-1 ll:block ll:text-muted-foreground">
                          {column.bulk.checked
                            ? t("settings.matrix.disableAll")
                            : t("settings.matrix.enableAll")}
                        </span>
                      ) : null}
                    </TooltipContent>
                  </Tooltip>
                </th>
              ))}
            </tr>
          </thead>
          <SettingsMatrixHoveredColumnContext.Provider value={hoveredColumn}>
            <tbody>{children}</tbody>
          </SettingsMatrixHoveredColumnContext.Provider>
        </table>
      </div>
    </TooltipProvider>
  );
};
