import { Ellipsis } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { openContextMenuFrom } from "@/components/ui/context-menu";
import { IconButton } from "@/components/ui/icon-button";

type ContextMenuMoreButtonProps = {
  className?: string;
};

/**
 * Visible "more actions" (⋯) button inside a context menu trigger. It opens
 * the same menu as a right-click, so the actions stay discoverable and
 * reachable by keyboard and touch.
 */
export const ContextMenuMoreButton: FC<ContextMenuMoreButtonProps> = ({
  className,
}) => {
  const { t } = useTranslation("common");

  return (
    <IconButton
      label={t("actions.moreActions")}
      className={className}
      onClick={(event) => {
        event.stopPropagation();
        openContextMenuFrom(event.currentTarget);
      }}
      // Rows act on a double click (e.g. a party invite); the button must not.
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <Ellipsis aria-hidden="true" />
    </IconButton>
  );
};
