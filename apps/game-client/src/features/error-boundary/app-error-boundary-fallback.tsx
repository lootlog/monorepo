import { CircleAlert, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { FallbackProps } from "react-error-boundary";
import { CopyDiagnosticsButton } from "@/components/copy-diagnostics-button";
import { DraggableWindow } from "@/components/draggable-window/draggable-window";
import { WindowFooter } from "@/components/draggable-window/window-footer";
import { Button } from "@/components/ui/button";
import { WarningMessage } from "@/components/warning-window/warning-message";
import { WindowLauncher } from "@/components/window-launcher";
import { createDiagnosticsReport } from "@/lib/diagnostics-report";
import { margonemRuntimeBridge } from "@/lib/margonem-runtime/margonem-runtime-bridge";
import { useWindowsStore } from "@/store/windows.store";
import {
  APP_ERROR_WINDOW_ID,
  APP_ERROR_WINDOW_MAX_HEIGHT,
  APP_ERROR_WINDOW_MIN_HEIGHT,
  APP_ERROR_WINDOW_WIDTH,
} from "./error-boundary.constants";
import { getErrorBoundaryDetails } from "./get-error-boundary-details";

export const AppErrorBoundaryFallback = ({
  error,
  resetErrorBoundary,
}: FallbackProps) => {
  const { t } = useTranslation("errorBoundary");
  const setOpen = useWindowsStore((state) => state.setOpen);
  const [isVisible, setIsVisible] = useState(true);

  const errorDetails = getErrorBoundaryDetails(error, {
    errorNameLabel: t("errorNameLabel"),
    errorMessageLabel: t("errorMessageLabel"),
    stackLabel: t("stackLabel"),
    unknownErrorName: t("unknownErrorName"),
    unknownErrorMessage: t("unknownErrorMessage"),
    missingStack: t("missingStack"),
  });

  useEffect(
    () => () => {
      setOpen(APP_ERROR_WINDOW_ID, false);
    },
    [setOpen],
  );

  const getReport = () =>
    [
      createDiagnosticsReport({
        bridgeHealth: margonemRuntimeBridge.getHealth(),
        failure: "interface error",
      }),
      errorDetails.clipboardText,
    ].join("\n\n");

  return (
    <>
      <DraggableWindow
        isOpen={isVisible}
        id={APP_ERROR_WINDOW_ID}
        title={t("title")}
        onClose={() => setIsVisible(false)}
        resizable
        minWidth={APP_ERROR_WINDOW_WIDTH}
        minHeight={APP_ERROR_WINDOW_MIN_HEIGHT}
        maxHeight={APP_ERROR_WINDOW_MAX_HEIGHT}
        contentClassName="ll:flex ll:min-h-0 ll:flex-col"
      >
        <WarningMessage
          icon={CircleAlert}
          iconClassName="ll:text-destructive"
          heading={t("heading")}
          description={t("description")}
        />
        <div className="ll:flex ll:min-h-0 ll:flex-1 ll:flex-col ll:gap-2 ll:px-3 ll:pb-3">
          <dl className="ll:m-0 ll:grid ll:grid-cols-[auto_1fr] ll:gap-x-3 ll:gap-y-1 ll:text-xs ll:leading-4">
            <dt className="ll:text-muted-foreground">{t("errorNameLabel")}</dt>
            <dd className="ll:m-0 ll:break-all ll:text-foreground">
              {errorDetails.name}
            </dd>
            <dt className="ll:text-muted-foreground">
              {t("errorMessageLabel")}
            </dt>
            <dd className="ll:m-0 ll:break-all ll:text-foreground">
              {errorDetails.message}
            </dd>
          </dl>
          <p className="ll:m-0 ll:text-xs ll:leading-4 ll:text-muted-foreground">
            {t("stackLabel")}
          </p>
          <pre className="ll:m-0 ll:min-h-0 ll:flex-1 ll:overflow-auto ll:whitespace-pre-wrap ll:break-words ll:rounded-sm ll:border ll:border-border/20 ll:bg-muted/40 ll:p-2 ll:font-mono ll:text-xs ll:leading-4 ll:text-foreground">
            {errorDetails.stack}
          </pre>
        </div>
        <WindowFooter rowClassName="ll:justify-between ll:gap-1 ll:px-1">
          <CopyDiagnosticsButton getReport={getReport} variant="ghost" />
          <Button type="button" size="xs" onClick={resetErrorBoundary}>
            <RotateCcw aria-hidden />
            {t("reloadButton")}
          </Button>
        </WindowFooter>
      </DraggableWindow>
      {isVisible ? null : (
        <WindowLauncher
          icon={CircleAlert}
          label={t("launcher")}
          onOpen={() => setIsVisible(true)}
        />
      )}
    </>
  );
};
