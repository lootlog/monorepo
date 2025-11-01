import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { useWindowsStore, type WindowId } from "@/store/windows.store";
import type { FC, ReactNode } from "react";

export type QuickAccessButtonProps = {
  id: WindowId | "lootlog-app";
  title: string;
  icon: ReactNode;
  href?: string;
};

export const QuickAccessButton: FC<QuickAccessButtonProps> = ({
  id,
  title,
  icon,
  href,
}) => {
  const { toggleOpen } = useWindowsStore();

  const handleClick = () => {
    if (href) {
      window.open(href, "_blank");
    } else {
      toggleOpen(id as WindowId);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className="ll:quick-access-button ll-custom-cursor-pointer ll:h-6"
          onClick={handleClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <span>{title}</span>
      </TooltipContent>
    </Tooltip>
  );
};
