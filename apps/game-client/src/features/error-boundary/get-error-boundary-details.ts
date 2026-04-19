import type { ErrorBoundaryTranslations } from "./error-boundary-translations";

type ErrorBoundaryDetails = {
  name: string;
  message: string;
  stack: string;
  clipboardText: string;
};

function getObjectProperty(
  value: unknown,
  key: "name" | "message" | "stack",
): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const propertyValue = Reflect.get(value, key);

  if (typeof propertyValue !== "string") {
    return undefined;
  }

  const trimmedValue = propertyValue.trim();

  if (trimmedValue.length === 0) {
    return undefined;
  }

  return trimmedValue;
}

function stringifyUnknownError(
  error: unknown,
  fallbackMessage: string,
): string {
  if (typeof error === "string") {
    const trimmedError = error.trim();
    return trimmedError.length > 0 ? trimmedError : fallbackMessage;
  }

  if (!error || typeof error !== "object") {
    return fallbackMessage;
  }

  try {
    const serializedError = JSON.stringify(error, null, 2);

    if (serializedError) {
      return serializedError;
    }
  } catch {
    return fallbackMessage;
  }

  return fallbackMessage;
}

export function getErrorBoundaryDetails(
  error: unknown,
  translations: ErrorBoundaryTranslations,
): ErrorBoundaryDetails {
  const name =
    getObjectProperty(error, "name") ?? translations.unknownErrorName;
  const message =
    getObjectProperty(error, "message") ??
    stringifyUnknownError(error, translations.unknownErrorMessage);
  const stack = getObjectProperty(error, "stack") ?? translations.missingStack;
  const clipboardText = [
    `${translations.errorNameLabel}: ${name}`,
    `${translations.errorMessageLabel}: ${message}`,
    "",
    `${translations.stackLabel}:`,
    stack,
  ].join("\n");

  return {
    name,
    message,
    stack,
    clipboardText,
  };
}
