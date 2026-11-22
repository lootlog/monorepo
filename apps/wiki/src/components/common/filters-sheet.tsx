import { SlidersHorizontal } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetTitle,
  SheetTrigger,
} from "@lootlog/ui/components/sheet";
import { t } from "@/i18n/messages";
import { FiltersHeader } from "./filters-header";

type FiltersSheetProps = {
  count: number;
  children: ReactNode;
};

export function FiltersSheet({ count, children }: FiltersSheetProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger
        render={<Button variant="outline" size="lg" className="md:hidden" />}
      >
        <SlidersHorizontal aria-hidden="true" />
        {t("filters.title")}
        {count > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground tabular-nums">
            {count}
          </span>
        ) : null}
      </SheetTrigger>
      <SheetContent side="left" className="gap-0 bg-card p-0">
        <FiltersHeader
          count={count}
          className="pr-12"
          renderTitle={(title) => (
            <SheetTitle className="text-sm">{title}</SheetTitle>
          )}
        />
        <ScrollArea orientation="vertical" className="min-h-0 flex-1">
          <div className="px-3">{children}</div>
        </ScrollArea>
        <SheetFooter className="mt-0 border-t border-border/50 p-3">
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={() => setIsOpen(false)}
          >
            {t("filters.showResults")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
