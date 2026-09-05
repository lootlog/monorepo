import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@lootlog/ui/components/accordion";

const faqKeys = ["1", "2", "3", "4", "5", "6"] as const;

export function FaqPanel() {
  const { t } = useTranslation();

  return (
    <div className="w-full">
      <Accordion defaultValue={["item-0"]} className="w-full space-y-3">
        {faqKeys.map((key, index) => (
          <AccordionItem
            key={key}
            value={`item-${index}`}
            className="border-0 rounded-[var(--broadcast-radius-card)] bg-[var(--broadcast-ink-soft)] px-5 sm:px-6"
          >
            <AccordionTrigger className="min-h-20 gap-5 rounded-[var(--broadcast-radius-control)] px-0 py-5 text-left text-base font-bold text-[var(--broadcast-white)] hover:text-[var(--broadcast-lime)] hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--broadcast-lime)] focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--broadcast-ink)]">
              <span className="flex items-start gap-4">
                <span className="mt-1 font-mono text-xs font-bold text-[var(--broadcast-cyan)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{t(`landing.faq.q${key}`)}</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-6 pl-0 pr-4 sm:pl-9">
              <p className="max-w-[68ch] text-base leading-7 text-[var(--broadcast-text-muted)]">
                {t(`landing.faq.a${key}`)}
              </p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
