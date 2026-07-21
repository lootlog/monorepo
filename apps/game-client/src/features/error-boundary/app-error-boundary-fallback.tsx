import { DraggableWindow } from "@/components/draggable-window";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useWindowsStore } from "@/store/windows.store";
import type { FallbackProps } from "react-error-boundary";
import { useLayoutEffect, useState } from "react";
import {
  APP_ERROR_WINDOW_DEFAULT_HEIGHT,
  APP_ERROR_WINDOW_ID,
  APP_ERROR_WINDOW_MAX_HEIGHT,
  APP_ERROR_WINDOW_MIN_HEIGHT,
  APP_ERROR_WINDOW_WIDTH,
} from "./error-boundary.constants";
import { getErrorBoundaryDetails } from "./get-error-boundary-details";

type CopyState = "idle" | "success" | "error";

export const AppErrorBoundaryFallback = ({ error }: FallbackProps) => {
  const { t } = useTranslation("errorBoundary");
  const setPosition = useWindowsStore((state) => state.setPosition);
  const setOpen = useWindowsStore((state) => state.setOpen);
  const [isVisible, setIsVisible] = useState(true);
  const [isPositionReady, setIsPositionReady] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const translations = {
    title: t("title"),
    summary: t("summary"),
    detailsHint: t("detailsHint"),
    errorNameLabel: t("errorNameLabel"),
    errorMessageLabel: t("errorMessageLabel"),
    stackLabel: t("stackLabel"),
    copyButton: t("copyButton"),
    copySuccessButton: t("copySuccessButton"),
    copyErrorButton: t("copyErrorButton"),
    closeButton: t("closeButton"),
    unknownErrorName: t("unknownErrorName"),
    unknownErrorMessage: t("unknownErrorMessage"),
    missingStack: t("missingStack"),
  };
  const errorDetails = getErrorBoundaryDetails(error, translations);

  useLayoutEffect(() => {
    const centeredPosition = {
      x: Math.round((window.innerWidth - APP_ERROR_WINDOW_WIDTH) / 2),
      y: Math.round((window.innerHeight - APP_ERROR_WINDOW_DEFAULT_HEIGHT) / 2),
    };

    setPosition(APP_ERROR_WINDOW_ID, centeredPosition);
    setIsPositionReady(true);

    return () => {
      setOpen(APP_ERROR_WINDOW_ID, false);
    };
  }, [setOpen, setPosition]);

  const handleClose = () => {
    setOpen(APP_ERROR_WINDOW_ID, false);
    setIsVisible(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(errorDetails.clipboardText);
      setCopyState("success");
    } catch {
      setCopyState("error");
    }
  };

  const copyButtonLabel =
    copyState === "success"
      ? translations.copySuccessButton
      : copyState === "error"
        ? translations.copyErrorButton
        : translations.copyButton;

  return (
    <DraggableWindow
      isOpen={isVisible && isPositionReady}
      id={APP_ERROR_WINDOW_ID}
      title={translations.title}
      onClose={handleClose}
      resizable
      minWidth={APP_ERROR_WINDOW_WIDTH}
      minHeight={APP_ERROR_WINDOW_MIN_HEIGHT}
      maxHeight={APP_ERROR_WINDOW_MAX_HEIGHT}
      contentClassName="ll:flex ll:min-h-0 ll:flex-col"
    >
      <div className="ll:flex ll:min-h-0 ll:flex-1 ll:flex-col ll:gap-3 ll:p-4">
        <div className="ll:flex ll:flex-col ll:gap-2 ll:text-sm ll:text-gray-200">
          <p>{translations.summary}</p>
          <p className="ll:text-xs ll:text-gray-400">
            {translations.detailsHint}
          </p>
        </div>

        <div className="ll:flex ll:flex-col ll:gap-1 ll:text-xs ll:text-gray-200">
          <p>
            <span className="ll:font-semibold ll:text-white">
              {translations.errorNameLabel}:{" "}
            </span>
            <span className="ll:break-all">{errorDetails.name}</span>
          </p>
          <p>
            <span className="ll:font-semibold ll:text-white">
              {translations.errorMessageLabel}:{" "}
            </span>
            <span className="ll:break-all">{errorDetails.message}</span>
          </p>
        </div>

        <div className="ll:flex ll:min-h-0 ll:flex-1 ll:flex-col ll:gap-1">
          <p className="ll:text-xs ll:font-semibold ll:text-white">
            {translations.stackLabel}
          </p>
          <pre className="ll:min-h-0 ll:flex-1 ll:overflow-auto ll:whitespace-pre-wrap ll:break-words ll:rounded-sm ll:border ll:border-white/15 ll:bg-black/30 ll:p-3 ll:text-[11px] ll:leading-4 ll:text-gray-200">
            {errorDetails.stack}
          </pre>
        </div>

        <div className="ll:flex ll:justify-end ll:gap-2">
          <Button onClick={handleCopy} type="button">
            {copyButtonLabel}
          </Button>
          <Button onClick={handleClose} type="button" variant="ghost">
            {translations.closeButton}
          </Button>
        </div>
      </div>
    </DraggableWindow>
  );
};
