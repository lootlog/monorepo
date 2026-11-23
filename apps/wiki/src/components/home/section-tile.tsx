import { Link, type LinkOptions } from "@tanstack/react-router";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { t } from "@/i18n/messages";
import { Card } from "@lootlog/ui/components/card";

type SectionTileProps = {
  link: LinkOptions;
  icon: LucideIcon;
  label: string;
  description: string;
};

export function SectionTile({
  link,
  icon: Icon,
  label,
  description,
}: SectionTileProps) {
  return (
    <Card variant="interactive" className="h-full gap-0 py-0">
      <Link
        {...link}
        className="group/section flex h-full flex-col gap-4 rounded-[inherit] p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/12 text-primary transition-[scale] duration-200 ease-out group-hover/section:scale-105 motion-reduce:transition-none">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <span className="flex flex-1 flex-col gap-1">
          <span className="text-base font-semibold tracking-tight text-foreground">
            {label}
          </span>
          <span className="text-sm text-pretty text-muted-foreground">
            {description}
          </span>
        </span>
        <span className="flex items-center gap-1 text-sm font-medium text-primary">
          {t("home.open")}
          <ChevronRight
            aria-hidden="true"
            className="size-4 transition-[translate] duration-150 group-hover/section:translate-x-0.5 motion-reduce:transition-none"
          />
        </span>
      </Link>
    </Card>
  );
}
