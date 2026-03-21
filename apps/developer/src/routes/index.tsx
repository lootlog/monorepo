import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Book,
  Rocket,
  Star,
  HelpCircle,
  Calendar,
  Download,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lootlog Developer Portal" },
      {
        name: "description",
        content: "Dokumentacja i zasoby dla deweloperów Lootlog",
      },
    ],
  }),
  component: IndexPage,
});

const sections = [
  {
    title: "Wprowadzenie",
    description: "Czym jest Lootlog i jakie oferuje funkcje",
    href: "/docs/index",
    icon: Book,
  },
  {
    title: "Instalacja",
    description: "Jak zainstalować dodatek Lootlog",
    href: "/docs/installation",
    icon: Download,
  },
  {
    title: "Podstawy używania",
    description: "Naucz się korzystać z podstawowych funkcji",
    href: "/docs/getting-started",
    icon: Rocket,
  },
  {
    title: "Funkcje",
    description: "Szczegółowy przegląd wszystkich funkcji",
    href: "/docs/features",
    icon: Star,
  },
  {
    title: "Eventy klanowe",
    description: "Organizuj polowania na herosów eventowych",
    href: "/docs/events",
    icon: Calendar,
  },
  {
    title: "FAQ",
    description: "Odpowiedzi na najczęściej zadawane pytania",
    href: "/docs/faq",
    icon: HelpCircle,
  },
];

function IndexPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 lg:py-24">
      {/* Hero */}
      <div className="mb-14">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-xs text-muted-foreground">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Dokumentacja
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          <span className="text-foreground">Lootlog</span>{" "}
          <span className="text-muted-foreground/60">Developer Portal</span>
        </h1>
        <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted-foreground">
          Dokumentacja, przewodniki i zasoby dla użytkowników i deweloperów
          Lootlog.
        </p>
      </div>

      {/* Cards grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.href}
            to={section.href}
            className="group relative flex items-start gap-4 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.04]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] transition-colors duration-200 group-hover:border-white/[0.12] group-hover:bg-white/[0.06]">
              <section.icon className="h-4 w-4 text-muted-foreground transition-colors duration-200 group-hover:text-foreground/80" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="flex items-center gap-2 font-semibold text-foreground/90 transition-colors duration-200 group-hover:text-foreground">
                {section.title}
                <ArrowRight className="h-3.5 w-3.5 -translate-x-1 text-muted-foreground/0 transition-all duration-200 group-hover:translate-x-0 group-hover:text-muted-foreground/60" />
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground/70">
                {section.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
