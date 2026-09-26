import { Maximize2, Minimize2 } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { IconButton } from "@/components/ui/icon-button";
import { useWindowsStore } from "@/store/windows.store";

type QuickAccessCollapseButtonProps = {
  collapsed: boolean;
};

// Toggling swaps the expanded bar for the collapsed one, so the button that
// was pressed unmounts. The flag hands keyboard focus to its counterpart; it
// is set only by a press, never on load, so a restored collapsed bar does not
// take focus from the game.
let focusNextToggle = false;

/** Switches the quick access bar between its expanded and collapsed sizes. */
export const QuickAccessCollapseButton: FC<QuickAccessCollapseButtonProps> = ({
  collapsed,
}) => {
  const { t } = useTranslation("quickAccess");
  const setCollapsed = useWindowsStore((state) => state.setCollapsed);

  return (
    <IconButton
      ref={(button: HTMLButtonElement | null) => {
        if (!button || !focusNextToggle) return;
        focusNextToggle = false;
        button.focus({ preventScroll: true });
      }}
      label={collapsed ? t("collapse.expand") : t("collapse.collapse")}
      onClick={(event) => {
        focusNextToggle = event.currentTarget === document.activeElement;
        setCollapsed("quick-access", !collapsed);
      }}
    >
      {collapsed ? (
        <Maximize2 aria-hidden="true" />
      ) : (
        <Minimize2 aria-hidden="true" />
      )}
    </IconButton>
  );
};
