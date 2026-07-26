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
    <div className="w-full">
      <Accordion
        type="single"
        collapsible
        defaultValue="item-0"
        className="w-full border-t border-[#31425b]"
      >
        {faqKeys.map((key, index) => (
          <AccordionItem
            key={key}
            value={`item-${index}`}
            className="border-b border-[#31425b] px-0"
          >
            <AccordionTrigger className="min-h-20 gap-5 rounded-md px-0 py-5 text-left text-lg font-bold text-[#f7f8f2] hover:text-[#c8f135] hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8f135] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0d1a2c]">
              <span className="flex items-start gap-4">
                <span className="mt-1 text-xs font-bold text-[#7f93ae]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{t(`landing.faq.q${key}`)}</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-7 pl-9 pr-6">
              <p className="max-w-[68ch] text-base leading-7 text-[#aebed4]">
                {t(`landing.faq.a${key}`)}
              </p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
