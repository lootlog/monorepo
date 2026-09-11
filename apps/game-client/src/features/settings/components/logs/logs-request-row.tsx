import { SettingsIconButton } from "@/components/settings/settings-icon-button";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  LOG_PRE_CLASS_NAME,
  LOG_STATUS_CHIP_CLASS_NAMES,
} from "@/features/settings/components/logs/logs.constants";
import {
  formatLogDateTime,
  formatLogTimestamp,
  getStatusLabel,
  stringifyLogValue,
} from "@/features/settings/components/logs/logs.helpers";
import type { LoggedApiRequest } from "@/store/logs.store";
import { cn } from "cn";
import { ChevronDown, Copy } from "lucide-react";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";

type LogsRequestRowProps = {
  request: LoggedApiRequest;
  onCopy: (request: LoggedApiRequest) => void;
};

/** One API request row of an expanded action plus its payload/response detail row. */
export const LogsRequestRow: FC<LogsRequestRowProps> = ({
  request,
  onCopy,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  const toggleOpen = () => {
    setIsOpen((currentIsOpen) => !currentIsOpen);
  };

  return (
    <>
      <TableRow
        className="ll-custom-cursor-pointer"
        data-state={isOpen ? "expanded-detail" : undefined}
        onClick={toggleOpen}
      >
        <TableCell className="ll:font-mono">{request.method}</TableCell>
        <TableCell
          className="ll:w-full ll:max-w-0 ll:truncate ll:font-mono"
          title={request.endpoint}
        >
          {request.endpoint}
        </TableCell>
        <TableCell>
          <span
            className={cn(
              "ll:rounded-sm ll:px-1.5 ll:py-px ll:text-[10px] ll:font-medium",
              LOG_STATUS_CHIP_CLASS_NAMES[request.status],
            )}
            title={getStatusLabel(request.status)}
          >
            {request.statusCode ?? getStatusLabel(request.status)}
          </span>
        </TableCell>
        <TableCell
          className="ll:w-0 ll:tabular-nums ll:text-muted-foreground"
          title={formatLogDateTime(request.createdAt)}
        >
          {formatLogTimestamp(request.createdAt)}
        </TableCell>
        <TableCell className="ll:w-0">
          <div className="ll:flex ll:items-center ll:justify-end ll:gap-0.5">
            <SettingsIconButton
              label={t("common:actions.copyRequest")}
              onClick={(event) => {
                event.stopPropagation();
                onCopy(request);
              }}
            >
              <Copy />
            </SettingsIconButton>
            <SettingsIconButton
              aria-expanded={isOpen}
              label={t("settings.logs.toggleRequestDetails")}
              onClick={(event) => {
                event.stopPropagation();
                toggleOpen();
              }}
            >
              <ChevronDown
                className={cn(
                  "ll:transition-transform ll:duration-200",
                  isOpen && "ll:rotate-180",
                )}
              />
            </SettingsIconButton>
          </div>
        </TableCell>
      </TableRow>
      {isOpen ? (
        <TableRow data-state="expanded-detail">
          <TableCell className="ll:whitespace-normal ll:p-2" colSpan={5}>
            <div className="ll:grid ll:gap-2 ll:md:grid-cols-2">
              <div className="ll:flex ll:min-w-0 ll:flex-col ll:gap-1">
                <span className="ll:text-[11px] ll:font-semibold ll:text-gray-300">
                  {t("settings.logs.payload")}
                </span>
                <pre className={LOG_PRE_CLASS_NAME}>
                  {stringifyLogValue(request.payload)}
                </pre>
              </div>
              <div className="ll:flex ll:min-w-0 ll:flex-col ll:gap-1">
                <span className="ll:text-[11px] ll:font-semibold ll:text-gray-300">
                  {t("settings.logs.response")}
                </span>
                <pre className={LOG_PRE_CLASS_NAME}>
                  {stringifyLogValue(request.response)}
                </pre>
              </div>
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
};
