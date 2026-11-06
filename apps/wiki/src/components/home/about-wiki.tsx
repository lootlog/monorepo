import { Backpack, ScrollText, Swords } from "lucide-react";
import { t } from "@/i18n/messages";

const FACTS = [
  { key: "drops", icon: Swords },
  { key: "stats", icon: ScrollText },
  { key: "planning", icon: Backpack },
] as const;

/** Where the wiki's data comes from and what it covers. */
export function AboutWiki() {
  return (
    <ul className="grid divide-border rounded-xl border border-border/50 bg-card max-md:divide-y md:grid-cols-3 md:divide-x">
      {FACTS.map(({ key, icon: Icon }) => (
        <li key={key} className="flex flex-col gap-2 p-5 md:p-6">
          <Icon aria-hidden="true" className="mb-1 size-5 text-primary" />
          <h3 className="text-[0.9375rem] font-semibold text-foreground">
            {t(`home.about.${key}Title`)}
          </h3>
          <p className="text-sm text-pretty text-muted-foreground">
            {t(`home.about.${key}Description`)}
          </p>
        </li>
      ))}
    </ul>
  );
}
