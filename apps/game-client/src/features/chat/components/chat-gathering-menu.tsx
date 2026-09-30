import { useState, type ReactNode } from "react";
import { Ellipsis } from "lucide-react";
import { useTranslation } from "react-i18next";
import { IconButton } from "@/components/ui/icon-button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

export function ChatGatheringMenu({
  children,
  side = "bottom",
}: {
  children: ReactNode;
  side?: "top" | "bottom";
}) {
  const { t } = useTranslation("chat");
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <IconButton
          label={t("gatherings.options")}
          className="ll:relative ll:z-10"
        >
          <Ellipsis aria-hidden />
        </IconButton>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align="end"
        className="ll:w-auto ll:min-w-36 ll:p-1"
        onClick={() => setOpen(false)}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
