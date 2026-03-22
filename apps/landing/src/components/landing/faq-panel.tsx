"use client";

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
    <div className="max-w-3xl mx-auto">
      <Accordion
        type="single"
        collapsible
        defaultValue="item-0"
        className="w-full space-y-4"
      >
        {faqKeys.map((key, index) => (
          <AccordionItem
            key={index}
            value={`item-${index}`}
            className="border border-white/[0.06] bg-white/[0.03] rounded-xl px-6 data-[state=open]:bg-white/[0.07] data-[state=open]:border-primary/20 hover:border-white/15 transition-all duration-300"
          >
            <AccordionTrigger className="py-4 text-left hover:no-underline hover:text-primary transition-colors">
              {t(`landing.faq.q${key}`)}
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <p className="text-muted-foreground leading-relaxed text-sm">
                {t(`landing.faq.a${key}`)}
              </p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
