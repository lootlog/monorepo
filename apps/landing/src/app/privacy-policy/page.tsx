import { Metadata } from "next";
import { JSX } from "react";

export const metadata: Metadata = {
  title: "Lootlog.pl - Polityka Prywatności",
  description:
    "Szczegóły dotyczące przetwarzania danych osobowych w Lootlog.pl",
};

export default function PrivacyPolicy(): JSX.Element {
  return (
    <div className="min-h-screen">
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-8 text-center">
            Polityka Prywatności
          </h1>
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-8 text-gray-300 space-y-6">
            <p className="text-sm text-gray-400">
              Data ostatniej aktualizacji:{" "}
              {new Date().toLocaleDateString("pl-PL")}
            </p>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                1. Informacje Ogólne
              </h2>
              <p>
                Niniejsza Polityka Prywatności określa zasady przetwarzania
                danych osobowych w ramach:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Aplikacji webowej lootlog.pl</li>
                <li>Bota Discord służącego do synchronizacji danych</li>
                <li>Dodatku do gry Margonem</li>
              </ul>
              <p className="mt-4 text-purple-200 bg-purple-900/30 p-3 rounded-lg">
                <strong>Uwaga:</strong> Lootlog.pl to projekt hobbystyczny
                tworzony z pasji do gry Margonem. Nie jest to przedsięwzięcie
                komercyjne, a wszystkie usługi są świadczone bezpłatnie dla
                społeczności graczy. Polityka ta została opracowana w celu
                zapewnienia transparentności i zgodności z przepisami RODO.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                2. Administrator Danych
              </h2>
              <p>
                Administratorem danych osobowych jest właściciel projektu
                hobbystycznego lootlog.pl. W sprawach dotyczących ochrony danych
                osobowych można kontaktować się poprzez:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>
                  Discord:{" "}
                  <a
                    href="https://discord.gg/mPcczaeYMu"
                    className="text-purple-400 hover:text-purple-300"
                  >
                    https://discord.gg/mPcczaeYMu
                  </a>
                </li>
                <li>
                  GitHub:{" "}
                  <a
                    href="https://github.com/lootlog/monorepo"
                    className="text-purple-400 hover:text-purple-300"
                  >
                    https://github.com/lootlog/monorepo
                  </a>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                3. Przetwarzane Dane
              </h2>
              <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                3.1 Jakie dane zbieramy
              </h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>
                  Dane z autoryzacji Discord (ID użytkownika, nick, avatar,
                  adres email)
                </li>
                <li>
                  Informacje o postaci w grze Margonem (nick, serwer, poziom)
                </li>
                <li>Dane o przynależności do gildii/klanu</li>
                <li>Zebrane łupy z gry (przedmioty, lokalizacja, czas)</li>
                <li>Timery respawnu potworów</li>
                <li>Adres IP w celach bezpieczeństwa i analitycznych</li>
                <li>Dane techniczne (przeglądarka, system operacyjny)</li>
                <li>ID serwera Discord (w celu konfiguracji powiadomień)</li>
                <li>
                  Podstawowe informacje o profilu Discord (nick, avatar, email -
                  jeśli udostępnione)
                </li>
              </ul>
              <p className="text-sm text-gray-400 mt-2">
                Dane zbierane są wyłącznie od użytkownika oraz z usług Discord i
                Margonem, na podstawie wyrażonej zgody.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                4. Cel i Podstawa Przetwarzania Danych
              </h2>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Świadczenie usług aplikacji (śledzenie łupów, timery)</li>
                <li>
                  Autoryzacja i uwierzytelnianie użytkowników poprzez Discord
                </li>
                <li>Zarządzanie kontami użytkowników</li>
                <li>Analiza statystyk i optymalizacja usługi</li>
                <li>Zapewnienie bezpieczeństwa platformy</li>
                <li>
                  Synchronizacja danych między aplikacją a serwerem Discord
                </li>
                <li>Wysyłanie powiadomień o timerach respawnu</li>
                <li>Powiązanie konta Discord z kontem lootlog.pl</li>
                <li>Zarządzanie uprawnieniami w gildii/klanie</li>
              </ul>
              <p className="mt-4">
                Przetwarzanie danych odbywa się na podstawie zgody użytkownika
                (art. 6 ust. 1 lit. a RODO) oraz prawnie uzasadnionego interesu
                administratora w zakresie zapewnienia bezpieczeństwa i
                funkcjonalności usługi (art. 6 ust. 1 lit. f RODO).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                5. Bot Discord – Ograniczenia
              </h2>
              <p>
                Bot Discord służy wyłącznie jako narzędzie synchronizacji danych
                między bazą danych lootlog.pl a serwerem Discord. Bot nie
                przetwarza treści wiadomości prywatnych, nie przechowuje
                historii rozmów i nie analizuje aktywności użytkowników poza
                funkcjami związanymi z lootlog.pl.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                6. Udostępnianie Danych
              </h2>
              <p>
                Dane osobowe nie są sprzedawane ani udostępniane podmiotom
                trzecim, z wyjątkiem:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>
                  Danych niezbędnych do funkcjonowania usług (np. Discord API)
                </li>
                <li>Podmiotów świadczących usługi hostingowe (np. Vercel)</li>
                <li>Sytuacji wymaganych prawem</li>
                <li>Ochrony praw i bezpieczeństwa użytkowników</li>
              </ul>
              <p className="text-sm text-gray-400 mt-2">
                Dostawcy usług mogą mieć siedzibę poza Europejskim Obszarem
                Gospodarczym. W takim przypadku dane są przekazywane wyłącznie w
                oparciu o odpowiednie mechanizmy zgodności, np. standardowe
                klauzule umowne.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                7. Okres Przechowywania
              </h2>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>
                  Dane konta: do momentu usunięcia konta przez użytkownika
                </li>
                <li>
                  Dane o łupach: przez czas niezbędny do świadczenia usługi
                </li>
                <li>Logi bezpieczeństwa: maksymalnie 12 miesięcy</li>
                <li>Dane analityczne: w formie zanonimizowanej</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                8. Prawa Użytkownika
              </h2>
              <p>Użytkownik ma prawo do:</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Dostępu do swoich danych osobowych</li>
                <li>Sprostowania nieprawidłowych danych</li>
                <li>Usunięcia danych (prawo do bycia zapomnianym)</li>
                <li>Ograniczenia przetwarzania</li>
                <li>Przenoszenia danych</li>
                <li>Wniesienia sprzeciwu wobec przetwarzania</li>
                <li>Cofnięcia zgody w dowolnym momencie</li>
              </ul>
              <p className="text-sm text-gray-400 mt-2">
                Użytkownik ma także prawo złożyć skargę do Prezesa Urzędu
                Ochrony Danych Osobowych (PUODO) w przypadku naruszenia
                przepisów o ochronie danych osobowych.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                9. Bezpieczeństwo
              </h2>
              <p>
                Stosujemy odpowiednie środki techniczne i organizacyjne w celu
                ochrony danych osobowych przed nieuprawnionym dostępem, utratą,
                zniszczeniem lub ujawnieniem. Dane są przechowywane na
                bezpiecznych serwerach z zastosowaniem szyfrowania. Jako projekt
                hobbystyczny, staramy się zapewnić najlepsze możliwe standardy
                bezpieczeństwa w ramach dostępnych nam zasobów.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                10. Pliki Cookie i Local Storage
              </h2>
              <p>Aplikacja wykorzystuje pliki cookie i Local Storage w celu:</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Utrzymania sesji logowania</li>
                <li>Zapamiętywania preferencji użytkownika</li>
                <li>Przechowywania ustawień interfejsu (motywy, layouty)</li>
                <li>Cache'owania danych w celu poprawy wydajności</li>
                <li>Analizy ruchu na stronie</li>
                <li>Zapewnienia bezpieczeństwa</li>
              </ul>
              <p className="mt-4">
                Local Storage przechowuje dane lokalnie w przeglądarce
                użytkownika i nie są one automatycznie wysyłane na serwer.
                Użytkownik może wyczyścić te dane w ustawieniach przeglądarki.
              </p>
              <p className="mt-4 text-sm text-gray-400">
                Jeśli korzystamy z narzędzi analitycznych (np. Google
                Analytics), są one skonfigurowane tak, by nie identyfikować
                użytkownika bez jego zgody.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                11. Zautomatyzowane podejmowanie decyzji i profilowanie
              </h2>
              <p>
                Nie stosujemy profilowania ani zautomatyzowanego podejmowania
                decyzji w oparciu o dane osobowe użytkownika.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                12. Zmiana administratora
              </h2>
              <p>
                W przypadku zmiany administratora projektu lootlog.pl, wszelkie
                dane osobowe zostaną przekazane nowemu administratorowi z
                zachowaniem obowiązujących przepisów RODO, a użytkownicy zostaną
                o tym poinformowani.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                13. Wersje dokumentu
              </h2>
              <p>
                Poprzednie wersje niniejszej polityki prywatności są dostępne na
                GitHub:
                <a
                  href="https://github.com/lootlog/monorepo/commits/main/apps/web/src/app/(public)/privacy-policy.tsx"
                  className="text-purple-400 hover:text-purple-300 ml-2"
                >
                  Zobacz historię zmian
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                14. Zmiany Polityki
              </h2>
              <p>
                Zastrzegamy sobie prawo do wprowadzania zmian w niniejszej
                Polityce Prywatności. O wszelkich istotnych zmianach użytkownicy
                zostaną poinformowani poprzez aplikację lub Discord.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                15. Kontakt
              </h2>
              <p>
                W przypadku pytań dotyczących przetwarzania danych osobowych lub
                chęci skorzystania ze swoich praw, prosimy o kontakt poprzez:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>
                  Serwer Discord:{" "}
                  <a
                    href="https://discord.gg/mPcczaeYMu"
                    className="text-purple-400 hover:text-purple-300"
                  >
                    https://discord.gg/mPcczaeYMu
                  </a>
                </li>
                <li>
                  GitHub Issues:{" "}
                  <a
                    href="https://github.com/lootlog/monorepo/issues"
                    className="text-purple-400 hover:text-purple-300"
                  >
                    https://github.com/lootlog/monorepo/issues
                  </a>
                </li>
              </ul>
            </section>

            <div className="mt-8 pt-6 border-t border-gray-600 text-center">
              <p className="text-sm text-gray-400">
                Ta polityka prywatności jest zgodna z Rozporządzeniem Parlamentu
                Europejskiego i Rady (UE) 2016/679 (RODO).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
