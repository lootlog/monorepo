"use client";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@lootlog/ui/components/accordion";

const faqData = [
  {
    question: "Gdzie analizować walki?",
    answer:
      "Po zainstalowaniu dodatku, logi walki trafiają do Panelu Gracza, gdzie możesz je przeglądać.",
  },
  {
    question: "Czy dostanę bana?",
    answer:
      "Nie. Lootlog to nakładka UI, która nie ingeruje w silnik gry ani nie wykonuje ruchów za postać.",
  },
  {
    question: "Ile to kosztuje?",
    answer:
      "0 SŁ. Projekt jest darmowy i tworzony przez społeczność (Open Source).",
  },
  {
    question: "Jak działają timery?",
    answer:
      "Timery synchronizują się automatycznie między graczami w klanie. Wystarczy, że jeden gracz zabije elitę, a reszta zobaczy odliczanie.",
  },
  {
    question: "Czy mogę używać na wielu postaciach?",
    answer:
      "Tak! Dodatek działa na wszystkich postaciach i światach. Dane są przypisane do konta Discord.",
  },
  {
    question: "Jak zgłosić błąd lub zaproponować funkcję?",
    answer:
      "Najlepiej przez naszego Discorda lub bezpośrednio na GitHubie w sekcji Issues. Chętnie przyjmujemy też pull requesty!",
  },
];

export function FaqPanel() {
  return (
    <div className="max-w-3xl mx-auto">
      <Accordion
        type="single"
        collapsible
        defaultValue="item-0"
        className="w-full space-y-4"
      >
        {faqData.map((item, index) => (
          <AccordionItem
            key={index}
            value={`item-${index}`}
            className="border border-white/[0.06] bg-white/[0.03] rounded-xl px-6 data-[state=open]:bg-white/[0.07] data-[state=open]:border-primary/20 hover:border-white/15 transition-all duration-300"
          >
            <AccordionTrigger className="py-4 text-left hover:no-underline hover:text-primary transition-colors">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <p className="text-muted-foreground leading-relaxed text-sm">
                {item.answer}
              </p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
