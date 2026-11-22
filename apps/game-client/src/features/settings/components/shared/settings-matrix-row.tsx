import { SettingsMatrixHoveredColumnContext } from "@/features/settings/components/shared/settings-matrix";
import { Switch } from "@/components/ui/switch";
import { cn } from "cn";
import {
  isValidElement,
  useContext,
  type ComponentProps,
  type FC,
  type MouseEvent,
  type ReactNode,
} from "react";

type SettingsMatrixRowProps = {
  title: ReactNode;
  cells: readonly ReactNode[];
  dimmed?: boolean;
  className?: string;
};

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

const hasEnabledSwitch = (cell: ReactNode) =>
  isValidElement<ComponentProps<typeof Switch>>(cell) &&
  cell.type === Switch &&
  !cell.props.disabled;

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
        className="ll:h-9 ll:whitespace-nowrap ll:px-2 ll:text-left ll:align-middle ll:text-[13px] ll:font-semibold ll:leading-4 ll:text-foreground"
      >
        {title}
      </th>
      {cells.map((cell, index) => (
        <td
          key={index}
          data-matrix-column={index}
          onClick={forwardCellClick}
          className={cn(
            "ll:h-9 ll:p-0 ll:text-center ll:align-middle ll:transition-colors",
            hasEnabledSwitch(cell) && "ll:cursor-pointer",
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
