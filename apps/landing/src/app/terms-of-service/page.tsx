import { Metadata } from "next/dist/lib/metadata/types/metadata-interface";
import { JSX } from "react";

export const metadata: Metadata = {
  title: "Lootlog.pl - Regulamin Serwisu",
  description: "Szczegóły dotyczące regulaminu serwisu Lootlog.pl",
};

export default function TermsOfService(): JSX.Element {
  return (
    <div className="min-h-screen">
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-8 text-center">
            Regulamin Serwisu
          </h1>
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-8 text-gray-300 space-y-6">
            <p className="text-sm text-gray-400">
              Data ostatniej aktualizacji:{" "}
              {new Date().toLocaleDateString("pl-PL")}
            </p>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                1. Postanowienia Ogólne
              </h2>
              <p>
                Niniejszy Regulamin określa zasady korzystania z serwisu
                lootlog.pl oraz związanych z nim usług, w tym:
              </p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Aplikacji webowej lootlog.pl</li>
                <li>Dodatku do gry Margonem</li>
                <li>Bota Discord do synchronizacji danych</li>
                <li>Wszystkich powiązanych usług i funkcjonalności</li>
              </ul>
              <p className="mt-4 text-purple-200 bg-purple-900/30 p-3 rounded-lg">
                <strong>Uwaga:</strong> Lootlog.pl to projekt hobbystyczny
                tworzony z pasji do gry Margonem. Nie jest to przedsięwzięcie
                komercyjne, a wszystkie usługi są świadczone bezpłatnie dla
                społeczności graczy. Bot Discord jest w trakcie procesu
                weryfikacji przez Discord w celu zapewnienia najwyższych
                standardów bezpieczeństwa.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                2. Definicje
              </h2>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>
                  <strong>Serwis</strong> - platforma lootlog.pl wraz z
                  wszystkimi jej funkcjonalnościami
                </li>
                <li>
                  <strong>Użytkownik</strong> - osoba korzystająca z Serwisu
                </li>
                <li>
                  <strong>Dodatek</strong> - rozszerzenie do gry Margonem
                  służące do zbierania danych
                </li>
                <li>
                  <strong>Klan</strong> - grupa użytkowników w grze Margonem
                  współdzieląca dane
                </li>
                <li>
                  <strong>Gildia</strong> - serwer Discord powiązany z klanem w
                  grze
                </li>
                <li>
                  <strong>Łupy</strong> - przedmioty zdobyte w grze Margonem
                </li>
                <li>
                  <strong>Timery</strong> - informacje o czasach respawnu
                  potworów w grze
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                3. Warunki Korzystania
              </h2>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                3.1 Rejestracja i Konto
              </h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Korzystanie z Serwisu wymaga autoryzacji przez Discord</li>
                <li>
                  Użytkownik odpowiada za bezpieczeństwo swojego konta Discord
                </li>
                <li>Zakazane jest udostępnianie konta innym osobom</li>
                <li>Użytkownik może posiadać tylko jedno konto</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                3.2 Korzystanie z Dodatku
              </h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>
                  Dodatek służy wyłącznie do zbierania danych o łupach i
                  timerach
                </li>
                <li>
                  Zakazane jest modyfikowanie dodatku w sposób niezgodny z
                  przeznaczeniem
                </li>
                <li>Użytkownik instaluje dodatek na własną odpowiedzialność</li>
                <li>
                  Dodatek nie może być używany do automatyzacji gry (boty,
                  makra)
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                3.3 Zarządzanie Klanem i Gildią
              </h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>
                  Liderzy klanu odpowiadają za zarządzanie członkami i
                  uprawnieniami w grze Margonem
                </li>
                <li>
                  Administratorzy gildii Discord zarządzają synchronizacją
                  danych i powiadomieniami
                </li>
                <li>
                  Dane klanu są współdzielone między członkami zgodnie z
                  ustawieniami
                </li>
                <li>
                  Zakazane jest nieuprawnione udostępnianie danych klanu osobom
                  trzecim
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                4. Zakazy i Ograniczenia
              </h2>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                4.1 Zakazane Działania
              </h3>
              <p>Użytkownikowi zabrania się:</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Używania Serwisu w sposób niezgodny z prawem</li>
                <li>Próby włamania lub naruszania bezpieczeństwa Serwisu</li>
                <li>
                  Umieszczania treści obraźliwych, rasistowskich lub
                  dyskryminujących
                </li>
                <li>Spamowania lub wysyłania niechcianych wiadomości</li>
                <li>
                  Kopiowania, odtwarzania lub dystrybucji treści Serwisu bez
                  zgody
                </li>
                <li>
                  Używania botów, skryptów lub innych narzędzi automatyzujących
                </li>
                <li>Ingerencji w działanie gry Margonem poprzez Serwis</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                4.2 Manipulacja Danymi
              </h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Zakazane jest fałszowanie danych o łupach lub timerach</li>
                <li>
                  Wprowadzanie nieprawdziwych informacji jest podstawą do
                  usunięcia konta
                </li>
                <li>
                  Dane muszą pochodzić wyłącznie z legalnej rozgrywki w Margonem
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                5. Odpowiedzialność
              </h2>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                5.1 Odpowiedzialność Serwisu
              </h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>
                  Serwis jest świadczony "jak jest" bez gwarancji ciągłości
                  działania
                </li>
                <li>
                  Jako projekt hobbystyczny, nie gwarantujemy bezbłędności
                  działania Serwisu
                </li>
                <li>
                  Nie ponosimy odpowiedzialności za straty wynikłe z korzystania
                  z Serwisu
                </li>
                <li>
                  Zastrzegamy sobie prawo do przerw technicznych i aktualizacji
                </li>
                <li>
                  Projekt może być czasowo niedostępny z powodu ograniczeń
                  technicznych lub finansowych
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                5.2 Odpowiedzialność Użytkownika
              </h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>
                  Użytkownik ponosi pełną odpowiedzialność za swoje działania w
                  Serwisie
                </li>
                <li>
                  Użytkownik zobowiązuje się do przestrzegania regulaminów gry
                  Margonem
                </li>
                <li>
                  Wszelkie szkody wyrządzone przez Użytkownika obciążają jego
                  odpowiedzialność
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                6. Własność Intelektualna
              </h2>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Wszelkie prawa do Serwisu należą do jego właścicieli</li>
                <li>
                  Grafiki i elementy gry Margonem są własnością Garmory sp. z
                  o.o.
                </li>
                <li>
                  Serwis wykorzystuje grafiki należące do firmy Garmory sp. z
                  o.o. w ramach funkcjonalności związanych z grą Margonem
                </li>
                <li>
                  Użytkownik otrzymuje jedynie licencję na korzystanie z Serwisu
                </li>
                <li>Zakazane jest kopiowanie kodu źródłowego bez zgody</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                7. Dane i Prywatność
              </h2>
              <p>
                Szczegółowe informacje o przetwarzaniu danych osobowych znajdują
                się w
                <a
                  href="/privacy-policy"
                  className="text-purple-400 hover:text-purple-300 ml-1"
                >
                  Polityce Prywatności
                </a>
                . Korzystając z Serwisu, Użytkownik wyraża zgodę na
                przetwarzanie danych zgodnie z tą polityką.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                8. Moderacja i Sankcje
              </h2>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                8.1 Środki Dyscyplinarne
              </h3>
              <p>W przypadku naruszenia Regulaminu możemy zastosować:</p>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>Ostrzeżenie</li>
                <li>Czasowe zawieszenie konta</li>
                <li>Trwałe usunięcie konta</li>
                <li>Zablokowanie dostępu do określonych funkcji</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                8.2 Procedura Odwoławcza
              </h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>
                  Użytkownik może odwołać się od decyzji przez Discord lub
                  GitHub
                </li>
                <li>Odwołanie powinno zawierać uzasadnienie i dowody</li>
                <li>Rozpatrzenie odwołania następuje w ciągu 14 dni</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                9. Zmiany Regulaminu
              </h2>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Zastrzegamy sobie prawo do zmiany Regulaminu</li>
                <li>O istotnych zmianach użytkownicy zostaną poinformowani</li>
                <li>
                  Kontynuowanie korzystania z Serwisu oznacza akceptację zmian
                </li>
                <li>
                  Użytkownik może zrezygnować z Serwisu w przypadku braku
                  akceptacji
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                10. Rozwiązanie Umowy
              </h2>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                10.1 Rezygnacja Użytkownika
              </h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Użytkownik może w każdej chwili usunąć swoje konto</li>
                <li>Usunięcie konta powoduje trwałe usunięcie danych</li>
                <li>
                  Niektóre dane mogą być zachowane w celach prawnych lub
                  bezpieczeństwa
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                10.2 Rozwiązanie przez Serwis
              </h3>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>
                  Możemy rozwiązać umowę w przypadku naruszenia Regulaminu
                </li>
                <li>
                  Zastrzegamy sobie prawo do zaprzestania świadczenia usług
                </li>
                <li>
                  O planowanym zaprzestaniu działalności poinformujemy z
                  wyprzedzeniem
                </li>
                <li>
                  Jako projekt hobbystyczny, może być konieczne czasowe lub
                  trwałe zaprzestanie działalności z przyczyn osobistych lub
                  technicznych
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                11. Postanowienia Końcowe
              </h2>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Regulamin wchodzi w życie z dniem publikacji</li>
                <li>W sprawach nieuregulowanych stosuje się prawo polskie</li>
                <li>
                  Jeśli jakiekolwiek postanowienie okaże się nieważne, pozostałe
                  pozostają w mocy
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                12. Kontakt
              </h2>
              <p>
                W sprawach związanych z Regulaminem można kontaktować się
                poprzez:
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
                Akceptując ten regulamin, Użytkownik potwierdza, że zapoznał się
                z jego treścią i zobowiązuje się do jego przestrzegania.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
