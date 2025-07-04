import { Button } from "@/components/ui/button";
import { useWindowsStore, WindowId } from "@/store/windows.store";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FC, ReactNode, useEffect } from "react";

export type QuickAccessButtonProps = {
  id: WindowId;
  title: string;
  icon: ReactNode;
};

export const QuickAccessButton: FC<QuickAccessButtonProps> = ({
  id,
  title,
  icon,
}) => {
  const { toggleOpen } = useWindowsStore();
  const key = `${id}-quick-access-button`;

  useEffect(() => {
    // @ts-ignore
    $(`#${key}`).tip(`
        <span>${title}</span>
      `);
  }, [key]);

  return (
    <Button
      id={key}
      className="ll-quick-access-button ll-custom-cursor-pointer ll-h-8"
      onClick={() => toggleOpen(id)}
    >
      {icon}
    </Button>
  );
};
