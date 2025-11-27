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
    <div className="py-4">
      <div className="flex items-center justify-between mb-8">
        <h3 className="font-bold text-xl tracking-tight">FAQ</h3>
      </div>
      <Accordion
        type="single"
        collapsible
        defaultValue="item-0"
        className="w-full"
      >
        {faqData.map((item, index) => (
          <AccordionItem
            key={index}
            value={`item-${index}`}
            className="border-b border-border last:border-0"
          >
            <AccordionTrigger className="py-4">
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
