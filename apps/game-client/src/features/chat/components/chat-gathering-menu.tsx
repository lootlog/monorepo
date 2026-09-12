import { useState, type ReactNode } from "react";
import { Ellipsis } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
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
        <Button
          size="xs"
          type="button"
          variant="ghost"
          className="ll:relative ll:z-10 ll:h-[24px] ll:w-[28px] ll:shrink-0 ll:border-0"
          aria-label={t("gatherings.options")}
        >
          <Ellipsis size={16} aria-hidden />
        </Button>
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
