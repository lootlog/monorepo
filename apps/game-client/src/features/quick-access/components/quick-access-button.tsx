import { Button } from "@/components/ui/button";
import { useWindowsStore, WindowId } from "@/store/windows.store";
import { FC, ReactNode, useEffect } from "react";

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
  const key = `${id}-quick-access-button`;

  useEffect(() => {
    // @ts-ignore
    $(`#${key}`).tip(`
        <span>${title}</span>
      `);
  }, [key]);

  const handleClick = () => {
    if (href) {
      window.open(href, "_blank");
    } else {
      toggleOpen(id as WindowId);
    }
  };

  return (
    <Button
      id={key}
      className="ll-quick-access-button ll-custom-cursor-pointer ll-h-8"
      onClick={handleClick}
    >
      {icon}
    </Button>
  );
};
