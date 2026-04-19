import i18n from "@/i18n/config";

export type ErrorBoundaryTranslations = ReturnType<
  typeof getErrorBoundaryTranslations
>;

export function getErrorBoundaryTranslations() {
  return {
    title: i18n.t("settings.errorBoundary.title"),
    summary: i18n.t("settings.errorBoundary.summary"),
    detailsHint: i18n.t("settings.errorBoundary.detailsHint"),
    errorNameLabel: i18n.t("settings.errorBoundary.errorNameLabel"),
    errorMessageLabel: i18n.t("settings.errorBoundary.errorMessageLabel"),
    stackLabel: i18n.t("settings.errorBoundary.stackLabel"),
    copyButton: i18n.t("settings.errorBoundary.copyButton"),
    copySuccessButton: i18n.t("settings.errorBoundary.copySuccessButton"),
    copyErrorButton: i18n.t("settings.errorBoundary.copyErrorButton"),
    closeButton: i18n.t("settings.errorBoundary.closeButton"),
    unknownErrorName: i18n.t("settings.errorBoundary.unknownErrorName"),
    unknownErrorMessage: i18n.t("settings.errorBoundary.unknownErrorMessage"),
    missingStack: i18n.t("settings.errorBoundary.missingStack"),
  };
}
