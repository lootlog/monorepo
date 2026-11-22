import type { ChangelogItem } from "@lootlog/changelog/changelog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@lootlog/ui/components/collapsible";
import { ChevronDown, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";

type WhatsNewFixesProps = {
  fixes: ChangelogItem[];
  className?: string;
};

export const WhatsNewFixes = ({ fixes, className }: WhatsNewFixesProps) => {
  const { t } = useTranslation();

  if (fixes.length === 0) return null;

  return (
    <Collapsible className={className}>
      <CollapsibleTrigger className="group/fixes flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-sm text-left text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none">
        <Wrench aria-hidden="true" className="size-3.5 shrink-0" />
        {t("layout.whatsNew.fixes", { count: fixes.length })}
        <ChevronDown
          aria-hidden="true"
          className="ml-auto size-3.5 shrink-0 transition-transform group-data-panel-open/fixes:rotate-180 motion-reduce:transition-none"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="flex list-disc flex-col gap-1.5 pb-3 pl-5.5 text-xs text-pretty text-muted-foreground">
          {fixes.map((fix) => (
            <li key={fix.id}>{fix.title}</li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
};
