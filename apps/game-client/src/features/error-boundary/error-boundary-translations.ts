const ERROR_BOUNDARY_TRANSLATIONS = {
  en: {
    title: "Application error",
    summary:
      "The interface crashed. You can copy the error details before closing this window.",
    detailsHint:
      "Closing this window hides the fallback only. The crashed part of the interface will not recover automatically.",
    errorNameLabel: "Error type",
    errorMessageLabel: "Message",
    stackLabel: "Stack trace",
    copyButton: "Copy error",
    copySuccessButton: "Copied",
    copyErrorButton: "Copy failed",
    closeButton: "Close",
    unknownErrorName: "Unknown error",
    unknownErrorMessage: "No error message was provided.",
    missingStack: "Stack trace is unavailable.",
  },
  pl: {
    title: "Błąd aplikacji",
    summary:
      "Interfejs się wywalił. Możesz skopiować szczegóły błędu przed zamknięciem tego okna.",
    detailsHint:
      "Zamknięcie tego okna ukrywa tylko fallback. Wywalona część interfejsu nie odzyska się automatycznie.",
    errorNameLabel: "Typ błędu",
    errorMessageLabel: "Wiadomość",
    stackLabel: "Stack trace",
    copyButton: "Kopiuj błąd",
    copySuccessButton: "Skopiowano",
    copyErrorButton: "Nie udało się skopiować",
    closeButton: "Zamknij",
    unknownErrorName: "Nieznany błąd",
    unknownErrorMessage: "Brak wiadomości błędu.",
    missingStack: "Stack trace jest niedostępny.",
  },
} as const;

export type ErrorBoundaryTranslations =
  (typeof ERROR_BOUNDARY_TRANSLATIONS)[keyof typeof ERROR_BOUNDARY_TRANSLATIONS];

export function getErrorBoundaryTranslations(): ErrorBoundaryTranslations {
  const browserLanguage =
    typeof navigator === "undefined" ? "pl" : navigator.language.toLowerCase();

  if (browserLanguage.startsWith("en")) {
    return ERROR_BOUNDARY_TRANSLATIONS.en;
  }

  return ERROR_BOUNDARY_TRANSLATIONS.pl;
}
