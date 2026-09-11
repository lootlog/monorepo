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
  type MouseEvent,
  type ReactNode,
} from "react";

export type SettingsMatrixColumn = {
  key: string;
  /** Short column name shown in the header. */
  label: string;
  icon: LucideIcon;
  /** One sentence shown in the header tooltip; explains what the column does. */
  description: string;
  /** The first column usually switches the whole row on; it stays highlighted. */
  primary?: boolean;
  /**
   * Header click sets every enabled row of the column at once: on unless all
   * of them are already on, then off. `checked` is true when all are on.
   */
  bulk?: {
    checked: boolean;
    onChange: (checked: boolean) => void;
  };
};

/** Index of the option column under the pointer, or null; rows highlight it. */
export const SettingsMatrixHoveredColumnContext = createContext<number | null>(
  null,
);

type SettingsMatrixProps = {
  /** Accessible name of the grid, e.g. the section title. */
  label: string;
  /** Header of the row-name column, e.g. "Typ". */
  rowHeader: string;
  columns: readonly SettingsMatrixColumn[];
  children: ReactNode;
  className?: string;
};

const readColumnIndex = (event: MouseEvent<HTMLElement>) => {
  const target = event.target;

  if (!(target instanceof Element)) return null;

  const cell = target.closest<HTMLElement>("[data-matrix-column]");

  if (!cell) return null;
  const index = Number(cell.dataset.matrixColumn);

  return Number.isNaN(index) ? null : index;
};

/**
 * Grid of settings: one row per category, one column per option, so every
 * option of every category is visible and comparable at once. Column names
 * show only while the whole grid fits the content column; otherwise the
 * header keeps the icons (the tooltip still names the column) so the grid
 * stays readable instead of scrolling.
 */
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

  // The labelled width is measured whenever the labels are rendered, so a
  // window that grows back past it shows them again.
  useLayoutEffect(() => {
    const table = tableRef.current;
    const rowHeader = rowHeaderRef.current;

    if (compact || !table || !rowHeader) return;
    // The table and its name column stretch to the container, so the natural
    // width is read with both stretches switched off for a moment (before paint).
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
        >
          <thead>
            <tr className="ll:border-0 ll:border-b ll:border-solid ll:border-border">
              <th
                ref={rowHeaderRef}
                scope="col"
                className={cn(
                  "ll:px-2 ll:py-2 ll:text-left ll:align-middle ll:text-[11px] ll:font-semibold ll:uppercase ll:leading-4 ll:tracking-wide ll:text-muted-foreground",
                  // With labels the name column absorbs the spare width; in
                  // icon-only mode every column keeps its own width instead.
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
                  // The tooltip trigger swallows its own click, so the bulk
                  // action listens on the cell the click bubbles to.
                  onClick={
                    column.bulk
                      ? () => column.bulk?.onChange(!column.bulk.checked)
                      : undefined
                  }
                  className={cn(
                    "ll:px-1 ll:py-2 ll:text-center ll:align-middle ll:font-normal ll:transition-colors",
                    column.primary &&
                      "ll:border-0 ll:border-e ll:border-solid ll:border-border",
                    // The name column absorbs the spare width; every option
                    // column shares one width so the switches line up in an
                    // even grid. Labels wrap inside it, and the header grows
                    // with them. Icon-only columns keep enough room for the
                    // control to read as its own column.
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
                    <TooltipContent side="bottom" className="ll:max-w-56">
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
