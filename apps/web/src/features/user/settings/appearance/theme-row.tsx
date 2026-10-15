import {
  getListTileLinkClassName,
  LIST_TILE_ACTIONS_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import type { CustomThemeStyle } from "@/themes/custom-theme";
import type { ThemePreview } from "@/themes/theme-preview";
import { cn } from "cn";
import { useState, type ReactNode } from "react";

const PALETTE_SLOTS = ["accent", "highlight", "background"] as const;

/** Each rounding step on a 20–24px swatch, from square to circle. */
const SWATCH_RADIUS: Record<ThemePreview["radius"], string> = {
  sharp: "0px",
  soft: "3px",
  default: "6px",
  round: "9px",
  pill: "9999px",
};

type ThemeRowProps = {
  title: string;
  description: string;
  preview: ThemePreview;
  /** The theme's class, which scopes its palette to the row. */
  themeClass: string;
  /** The theme's font and radius, and a custom theme's colours. */
  themeStyle: CustomThemeStyle;
  /** Whether the theme is in use; leave out where the row is not a toggle. */
  isActive?: boolean;
  /** Replaces the description on the theme in use. */
  activeLabel?: string;
  /** Picks the theme. */
  onSelect: () => void;
  /** A control at the row's end, such as editing the theme. */
  action?: ReactNode;
};

/**
 * One theme in a list. Pointed at or focused, the row is drawn in that theme:
 * its surfaces, text, accent, font and rounding, as a preview in place.
 */
export const ThemeRow = ({
  title,
  description,
  preview,
  themeClass,
  themeStyle,
  isActive,
  activeLabel,
  onSelect,
  action,
}: ThemeRowProps) => {
  // The row takes on its theme while pointed at or focused, so the list stays
  // calm and each theme shows itself on demand.
  const [isThemed, setIsThemed] = useState(false);

  return (
    <li
      data-list-tile
      // A theme's palette is scoped by its class and custom properties, so
      // the row and everything in it paint in that theme.
      className={cn(
        "flex items-center bg-linear-to-r transition-colors",
        LIST_TILE_RULE_CLASS,
        isThemed && [themeClass, "font-sans text-foreground"],
        isActive
          ? "from-primary/15 to-primary/15"
          : "from-transparent to-transparent hover:from-muted/30 hover:to-muted/30",
      )}
      style={isThemed ? themeStyle : undefined}
      onPointerEnter={() => setIsThemed(true)}
      onPointerLeave={() => setIsThemed(false)}
      onFocus={() => setIsThemed(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsThemed(false);
        }
      }}
    >
      <button
        type="button"
        aria-pressed={isActive}
        onClick={onSelect}
        className={cn(
          getListTileLinkClassName(action !== undefined),
          "cursor-pointer text-left",
        )}
      >
        <span
          aria-hidden
          className="relative block aspect-[2/1] w-16 shrink-0 overflow-hidden rounded-md border border-border bg-cover bg-center bg-no-repeat sm:w-24"
          style={{
            backgroundColor: preview.color,
            backgroundImage: preview.image
              ? `url("${preview.image}")`
              : undefined,
          }}
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span
            className={cn(
              "truncate text-sm font-semibold",
              isActive && "text-primary",
            )}
          >
            {title}
          </span>
          <span
            className={cn(
              "truncate text-xs leading-tight",
              isActive && activeLabel
                ? "font-medium text-primary"
                : "text-muted-foreground",
            )}
          >
            {isActive && activeLabel ? activeLabel : description}
          </span>
        </span>
        {/*
          A light inner rule outlines each swatch, so dark highlights and
          backgrounds stay visible on the dark row.
        */}
        <span
          aria-hidden
          className="mr-2 flex shrink-0 items-center gap-1 sm:mr-3"
        >
          {preview.colors.map((color, index) => (
            <span
              key={PALETTE_SLOTS[index]}
              className="size-5 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.16)] sm:size-6"
              style={{
                backgroundColor: color,
                borderRadius: SWATCH_RADIUS[preview.radius],
              }}
            />
          ))}
        </span>
      </button>
      {action && <div className={LIST_TILE_ACTIONS_CLASS}>{action}</div>}
    </li>
  );
};
