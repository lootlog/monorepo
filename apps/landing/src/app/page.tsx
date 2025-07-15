import { ADDON_URL } from "@/src/config/addon";
import { ChartLine, Logs, Timer } from "lucide-react";
import { Metadata } from "next";
import Image from "next/image";
import { JSX } from "react";

export const metadata: Metadata = {
  title: "Lootlog.pl - Dodatek do Margonem",
  description:
    "Zaawansowany dodatek do gry Margonem, który automatycznie śledzi łupy i timery respawnu potworów.",
};

export default function Home(): JSX.Element {
  return (
    <div>
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            <span className="bg-white bg-clip-text text-transparent">
              lootlog.pl
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Zaawansowany dodatek do gry Margonem, który automatycznie śledzi
            łupy i timery respawnu potworów.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={ADDON_URL}
              className="px-8 py-3 bg-[#7c3aed] hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
            >
              Zainstaluj Dodatek
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-black/20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-12">
            Główne Funkcjonalności
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-800/50 p-6 rounded-xl backdrop-blur-sm">
              <div className="w-12 h-12 bg-[#7c3aed] rounded-lg mb-4 flex items-center justify-center">
                <Logs />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Automatyczne zbieranie łupów
              </h3>
              <p className="text-gray-400">
                Dodatek automatycznie śledzi wszystkie łupy z walk i zapisuje je
                w bazie danych dla Twojego klanu.
              </p>
            </div>

            <div className="bg-slate-800/50 p-6 rounded-xl backdrop-blur-sm">
              <div className="w-12 h-12 bg-[#7c3aed] rounded-lg mb-4 flex items-center justify-center">
                <Timer />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Timery Respawnu
              </h3>
              <p className="text-gray-400">
                Śledź czasy respawnu potworów i otrzymuj powiadomienia, gdy będą
                gotowe do ponownej walki.
              </p>
            </div>

            <div className="bg-slate-800/50 p-6 rounded-xl backdrop-blur-sm">
              <div className="w-12 h-12 bg-[#7c3aed] rounded-lg mb-4 flex items-center justify-center">
                <ChartLine />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Statystyki i Analiza
              </h3>
              <p className="text-gray-400">
                Przeglądaj szczegółowe statystyki łupów, analizuj drop rate i
                optymalizuj swoją grę.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Screenshots Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-12">
            Zrzuty Ekranu
          </h2>

          {/* Game Addon Screenshots */}
          <div className="mb-16">
            <h3 className="text-2xl font-semibold text-white mb-8 text-center">
              Dodatek w Grze
            </h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-slate-800/30 p-4 rounded-xl">
                <div className="aspect-video bg-slate-700 rounded-lg mb-4 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Image
                      src="/screenshots/timers.png"
                      alt="Screenshot - Interfejs Timerów"
                      width={640}
                      height={360}
                      unoptimized
                    />
                  </div>
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">
                  Timery Respawnu
                </h4>
                <p className="text-gray-400">
                  Przejrzysty interfejs pokazujący aktywne timery potworów z
                  dokładnymi czasami respawnu.
                </p>
              </div>

              <div className="bg-slate-800/30 p-4 rounded-xl">
                <div className="aspect-video bg-slate-700 rounded-lg mb-4 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Image
                      src="/screenshots/detector.png"
                      alt="Screenshot - Interfejs Wykrywacza"
                      width={640}
                      height={360}
                      unoptimized
                    />
                  </div>
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">
                  Wykrywacz NPC
                </h4>
                <p className="text-gray-400">
                  Automatyczne wykrywanie potworów na mapie z informacjami o
                  typie i poziomie.
                </p>
              </div>
            </div>
          </div>

          {/* Web App Screenshots */}
          <div>
            <h3 className="text-2xl font-semibold text-white mb-8 text-center">
              Aplikacja
            </h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-slate-800/30 p-4 rounded-xl">
                <div className=" bg-slate-700 rounded-lg mb-4 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Image
                      src="/screenshots/dashboard.png"
                      alt="Screenshot - Interfejs Dashboardu"
                      width={640}
                      height={360}
                      unoptimized
                    />
                  </div>
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">
                  Dashboard Łupów
                </h4>
                <p className="text-gray-400">
                  Przeglądaj wszystkie zebrane łupy z zaawansowanymi filtrami i
                  statystykami.
                </p>
              </div>

              <div className="bg-slate-800/30 p-4 rounded-xl">
                <div className=" bg-slate-700 rounded-lg mb-4 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Image
                      src="/screenshots/roles.png"
                      alt="Screenshot - Interfejs Zarządzania Rolami"
                      width={640}
                      height={360}
                      unoptimized
                    />
                  </div>
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">
                  Zarządzanie Rolami
                </h4>
                <p className="text-gray-400">
                  Konfiguruj uprawnienia członków gildii i zarządzaj dostępem do
                  funkcji.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 px-4 bg-black/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-12">
            Dlaczego Warto Używać Lootloga?
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="text-left">
              <h3 className="text-xl font-semibold text-white mb-3">
                🎯 Zwiększ Efektywność
              </h3>
              <p className="text-gray-400 mb-6">
                Nigdy więcej nie przegap respawnu tytana lub herosa. Timery
                pomogą Ci zaplanować aktywność w grze.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3">
                📊 Analizuj Postępy
              </h3>
              <p className="text-gray-400">
                Śledź swoje łupy, analizuj swój i klanowy drop rate.
              </p>
            </div>

            <div className="text-left">
              <h3 className="text-xl font-semibold text-white mb-3">
                👥 Współpraca z Gildią
              </h3>
              <p className="text-gray-400 mb-6">
                Udostępniaj informacje o timerach i łupach członkom swojego
                klanu w czasie rzeczywistym.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3">
                🔧 Łatwa Instalacja
              </h3>
              <p className="text-gray-400">
                Prosty proces instalacji - wystarczy jeden klik, aby rozpocząć
                korzystanie z dodatku.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {/* <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Gotowy na Lepszą Przygodę w Margonem?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Dołącz do tysięcy graczy, którzy już korzystają z Lootlog i
            zwiększają swoją efektywność w grze.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors text-lg">
              Pobierz za Darmo
            </button>
            <button className="px-8 py-4 border border-gray-400 text-gray-300 hover:bg-gray-800 font-semibold rounded-lg transition-colors text-lg">
              Dokumentacja
            </button>
          </div>
        </div>
      </section> */}

      {/* Footer */}
    </div>
  );
}
