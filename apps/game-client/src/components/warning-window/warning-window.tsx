import type { FC, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DraggableWindow } from "@/components/draggable-window/draggable-window";
import { WindowFooter } from "@/components/draggable-window/window-footer";
import { Button } from "@/components/ui/button";
import { useWindowsStore } from "@/store/windows.store";
import { WarningMessage } from "./warning-message";

type WarningWindowProps = {
  id: "catching-whitelist-warning" | "backend-preferences-warning";
  open: boolean;
  title: string;
  icon: LucideIcon;
  heading: string;
  description: string;
  primaryAction: { label: string; onClick: () => void };
  onClose: () => void;
  children?: ReactNode;
};

export const WarningWindow: FC<WarningWindowProps> = ({
  id,
  open,
  title,
  icon,
  heading,
  description,
  primaryAction,
  onClose,
  children,
}) => {
  const { t } = useTranslation("common");
  const size = useWindowsStore((state) => state[id].size);

  return (
    <DraggableWindow
      isOpen={open}
      id={id}
      title={title}
      onClose={onClose}
      variant="small"
      resizable={false}
      minWidth={size.width}
      minHeight={size.height}
      dynamicHeight
      contentClassName="ll:flex ll:flex-col"
    >
      <WarningMessage icon={icon} heading={heading} description={description} />
      {children}
      <WindowFooter rowClassName="ll:justify-end ll:gap-1 ll:px-1">
        <Button type="button" variant="ghost" size="xs" onClick={onClose}>
          {t("actions.close")}
        </Button>
        <Button type="button" size="xs" onClick={primaryAction.onClick}>
          {primaryAction.label}
        </Button>
      </WindowFooter>
    </DraggableWindow>
  );
};
