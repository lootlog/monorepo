import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@lootlog/ui/components/collapsible";
import { TextLink } from "@lootlog/ui/components/text-link";
import { t } from "@/i18n/messages";

const MARGONEM_LOOT_RULES_URL = "https://pomoc.margonem.pl/index/view,372";

const LOOTLOG_DISCORD_URL = "https://discord.gg/mPcczaeYMu";

/**
 * How drop rates are counted, folded away, with the game's rules they follow
 * and where to report a mistake.
 */
export function DropRateMethod() {
  return (
    <Collapsible className="flex max-w-3xl flex-col gap-2">
      <CollapsibleTrigger className="group/method flex h-9 w-fit items-center gap-2 rounded-md px-1 text-left text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 -rotate-90 text-muted-foreground transition-[rotate] duration-200 ease-out group-data-panel-open/method:rotate-0 motion-reduce:transition-none"
        />
        {t("catalog.dropRateMethod.title")}
      </CollapsibleTrigger>
      <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0 motion-reduce:transition-none">
        <div className="flex flex-col gap-2 px-1 pt-1 pb-2 text-sm text-pretty text-muted-foreground">
          <p>{t("catalog.dropRateMethod.perRoll")}</p>
          <p>{t("catalog.dropRateMethod.shared")}</p>
          <p>{t("catalog.dropRateMethod.fullParty")}</p>
          <p>{t("catalog.dropRateMethod.personal")}</p>
          <p>{t("catalog.dropRateMethod.estimate")}</p>
          <p>
            {t("catalog.dropRateMethod.source")}{" "}
            <TextLink
              href={MARGONEM_LOOT_RULES_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("catalog.dropRateMethod.sourceLink")}
            </TextLink>
            . {t("catalog.dropRateMethod.report")}{" "}
            <TextLink
              href={LOOTLOG_DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("catalog.dropRateMethod.reportLink")}
            </TextLink>
            .
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
