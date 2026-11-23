import { useTranslation } from "react-i18next";
import { ArrowUpRight } from "lucide-react";
import { links } from "@/config/links";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@lootlog/ui/components/accordion";
import { TextLink } from "@lootlog/ui/components/text-link";

const faqItems = [
  { key: "1", guide: links.battleGuide },
  { key: "2" },
  { key: "3", guide: links.support },
  { key: "4", guide: links.addonGuide },
  { key: "5" },
  { key: "6" },
] as const;

export function FaqPanel() {
  const { t } = useTranslation();

  return (
    <div className="w-full">
      <Accordion defaultValue={["item-0"]} className="w-full space-y-3">
        {faqItems.map((item, index) => (
          <AccordionItem
            key={item.key}
            value={`item-${index}`}
            className="landing-faq-item rounded-[var(--broadcast-radius-card)] bg-[var(--broadcast-ink-soft)] px-4 sm:px-6"
          >
            <AccordionTrigger className="landing-faq-trigger min-h-20 gap-4 rounded-[var(--broadcast-radius-control)] px-0 py-4 text-left text-[var(--broadcast-white)] hover:text-[var(--broadcast-lime)] hover:no-underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              <span className="flex items-center gap-4">
                <span className="landing-faq-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{t(`landing.faq.q${item.key}`)}</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-6 pl-0 pr-2 sm:pl-[3.25rem] sm:pr-12">
              <p className="max-w-[68ch] text-base leading-7 text-[var(--broadcast-text-muted)]">
                {t(`landing.faq.a${item.key}`)}
              </p>
              {"guide" in item && (
                <TextLink
                  href={item.guide}
                  className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm"
                >
                  {t(`landing.faq.guide${item.key}`)}
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </TextLink>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
