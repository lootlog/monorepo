import { isObjectRecord } from "@lootlog/schema/records";
import { Option, Schema } from "effect";

const decodeErrorText = Schema.decodeUnknownOption(
  Schema.Trim.check(Schema.isNonEmpty()),
);

type ErrorBoundaryDetails = {
  name: string;
  message: string;
  stack: string;
  clipboardText: string;
};

type ErrorBoundaryTranslations = {
  errorNameLabel: string;
  errorMessageLabel: string;
  stackLabel: string;
  unknownErrorName: string;
  unknownErrorMessage: string;
  missingStack: string;
};

function getErrorProperty(
  cause: unknown,
  key: "name" | "message" | "stack",
): string | undefined {
  if (!isObjectRecord(cause)) return undefined;

  return Option.getOrUndefined(decodeErrorText(cause[key]));
}

function stringifyUnknownError(
  cause: unknown,
  fallbackMessage: string,
): string {
  const text = decodeErrorText(cause);

  if (Option.isSome(text)) return text.value;

  if (!isObjectRecord(cause)) return fallbackMessage;

  try {
    const serializedError = JSON.stringify(cause, null, 2);

    if (serializedError) return serializedError;
  } catch {
    return fallbackMessage;
  }

  return fallbackMessage;
}

export function getErrorBoundaryDetails(
  cause: unknown,
  translations: ErrorBoundaryTranslations,
): ErrorBoundaryDetails {
  const name = getErrorProperty(cause, "name") ?? translations.unknownErrorName;

  const message =
    getErrorProperty(cause, "message") ??
    stringifyUnknownError(cause, translations.unknownErrorMessage);

  const stack = getErrorProperty(cause, "stack") ?? translations.missingStack;

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
