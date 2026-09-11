import { SettingsMatrixHoveredColumnContext } from "@/components/settings/settings-matrix";
import { cn } from "cn";
import { useContext, type FC, type MouseEvent, type ReactNode } from "react";

type SettingsMatrixRowProps = {
  /** Category name; usually an NpcTypeChip. */
  title: ReactNode;
  /** One control per column, in column order. */
  cells: readonly ReactNode[];
  /**
   * Row whose primary switch is off: the other cells stay rendered but dim,
   * so the user still sees what would apply once the row is switched on.
   */
  dimmed?: boolean;
  className?: string;
};

/**
 * A click anywhere in a cell toggles the switch it holds, so the whole cell is
 * the target instead of the small control. Clicks on the control itself, on
 * other controls (e.g. a number field) and on disabled switches are left alone.
 */
const forwardCellClick = (event: MouseEvent<HTMLTableCellElement>) => {
  const target = event.target;

  if (!(target instanceof Element)) return;

  const control = target.closest(
    "button, input, select, textarea, a, [role='switch'], [role='textbox']",
  );

  if (control) return;

  const toggle = event.currentTarget.querySelector<HTMLElement>(
    "[data-slot='switch']:not([data-disabled])",
  );

  toggle?.click();
};

/** One category of a SettingsMatrix: name cell plus one cell per column. */
export const SettingsMatrixRow: FC<SettingsMatrixRowProps> = ({
  title,
  cells,
  dimmed = false,
  className,
}) => {
  const hoveredColumn = useContext(SettingsMatrixHoveredColumnContext);

  return (
    <tr
      data-dimmed={dimmed ? "true" : undefined}
      className={cn(
        "ll:border-0 ll:border-b ll:border-solid ll:border-border ll:transition-colors ll:last:border-b-0 ll:hover:bg-white/5",
        className,
      )}
    >
      <th
        scope="row"
        className="ll:h-9 ll:whitespace-nowrap ll:px-2 ll:text-left ll:align-middle ll:text-xs ll:font-semibold ll:leading-4 ll:text-foreground"
      >
        {title}
      </th>
      {cells.map((cell, index) => (
        <td
          // Cells are positional and never reordered.
          // oxlint-disable-next-line react/no-array-index-key
          key={index}
          data-matrix-column={index}
          onClick={forwardCellClick}
          className={cn(
            "ll:h-9 ll:p-0 ll:text-center ll:align-middle ll:transition-colors",
            "ll:has-[[data-slot=switch]:not([data-disabled])]:cursor-pointer",
            index === 0 &&
              "ll:border-0 ll:border-e ll:border-solid ll:border-border",
            hoveredColumn === index && "ll:bg-white/5",
          )}
        >
          <span
            className={cn(
              "ll:flex ll:h-9 ll:w-full ll:items-center ll:justify-center",
              index > 0 && dimmed && "ll:opacity-50",
            )}
          >
            {cell}
          </span>
        </td>
      ))}
    </tr>
  );
};
