import i18n from "@/i18n/config";

export type ErrorBoundaryTranslations = {
  title: string;
  summary: string;
  detailsHint: string;
  errorNameLabel: string;
  errorMessageLabel: string;
  stackLabel: string;
  copyButton: string;
  copySuccessButton: string;
  copyErrorButton: string;
  closeButton: string;
  unknownErrorName: string;
  unknownErrorMessage: string;
  missingStack: string;
};

export function getErrorBoundaryTranslations(): ErrorBoundaryTranslations {
  return {
    title: i18n.t("error-boundary.title"),
    summary: i18n.t("error-boundary.summary"),
    detailsHint: i18n.t("error-boundary.detailsHint"),
    errorNameLabel: i18n.t("error-boundary.errorNameLabel"),
    errorMessageLabel: i18n.t("error-boundary.errorMessageLabel"),
    stackLabel: i18n.t("error-boundary.stackLabel"),
    copyButton: i18n.t("error-boundary.copyButton"),
    copySuccessButton: i18n.t("error-boundary.copySuccessButton"),
    copyErrorButton: i18n.t("error-boundary.copyErrorButton"),
    closeButton: i18n.t("error-boundary.closeButton"),
    unknownErrorName: i18n.t("error-boundary.unknownErrorName"),
    unknownErrorMessage: i18n.t("error-boundary.unknownErrorMessage"),
    missingStack: i18n.t("error-boundary.missingStack"),
  };
}
