import { SettingsIconButton } from "@/components/settings/settings-icon-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LOG_PRE_CLASS_NAME,
  LOG_STATUS_CHIP_BASE_CLASS_NAME,
  LOG_STATUS_CHIP_CLASS_NAMES,
} from "@/features/settings/components/logs/logs.constants";
import { LogsRequestRow } from "@/features/settings/components/logs/logs-request-row";
import {
  formatLogDateTime,
  formatLogTimestamp,
  getActionLabel,
  getStatusLabel,
  stringifyLogValue,
} from "@/features/settings/components/logs/logs.helpers";
import type { LoggedAction, LoggedApiRequest } from "@/store/logs.store";
import { cn } from "cn";
import { ChevronDown, Copy } from "lucide-react";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";

type LogsActionRowProps = {
  action: LoggedAction;
  onCopyAction: (action: LoggedAction) => void;
  onCopyRequest: (request: LoggedApiRequest) => void;
};

/** One logged action row plus its expandable payload/details/requests row. */
export const LogsActionRow: FC<LogsActionRowProps> = ({
  action,
  onCopyAction,
  onCopyRequest,
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
        <TableCell
          className="ll:w-0 ll:tabular-nums ll:text-muted-foreground"
          title={formatLogDateTime(action.createdAt)}
        >
          {formatLogTimestamp(action.createdAt)}
        </TableCell>
        <TableCell className="ll:w-full ll:max-w-0">
          <div className="ll:truncate ll:font-medium ll:text-foreground">
            {getActionLabel(action.actionType)}
          </div>
          <div className="ll:truncate ll:text-[11px] ll:text-muted-foreground">
            {action.actionType}
          </div>
        </TableCell>
        <TableCell>
          <span
            className={cn(
              LOG_STATUS_CHIP_BASE_CLASS_NAME,
              LOG_STATUS_CHIP_CLASS_NAMES[action.status],
            )}
          >
            {getStatusLabel(action.status)}
          </span>
        </TableCell>
        <TableCell className="ll:w-0">
          <div className="ll:flex ll:items-center ll:justify-end ll:gap-0.5">
            <SettingsIconButton
              label={t("common:actions.copyAction")}
              onClick={(event) => {
                event.stopPropagation();
                onCopyAction(action);
              }}
            >
              <Copy />
            </SettingsIconButton>
            <SettingsIconButton
              aria-expanded={isOpen}
              label={t("settings.logs.toggleActionDetails")}
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
          <TableCell className="ll:whitespace-normal ll:p-2" colSpan={4}>
            <div className="ll:flex ll:flex-col ll:gap-2">
              <div className="ll:grid ll:gap-2 ll:@min-[448px]/settings:grid-cols-2">
                <div className="ll:flex ll:min-w-0 ll:flex-col ll:gap-1">
                  <span className="ll:text-xs ll:font-semibold ll:text-muted-foreground">
                    {t("settings.logs.actionPayload")}
                  </span>
                  <pre className={LOG_PRE_CLASS_NAME}>
                    {stringifyLogValue(action.payload)}
                  </pre>
                </div>
                <div className="ll:flex ll:min-w-0 ll:flex-col ll:gap-1">
                  <span className="ll:text-xs ll:font-semibold ll:text-muted-foreground">
                    {t("settings.logs.actionDetails")}
                  </span>
                  <pre className={LOG_PRE_CLASS_NAME}>
                    {stringifyLogValue(action.details ?? null)}
                  </pre>
                </div>
              </div>
              {action.requests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        {t("settings.logs.requestColumns.method")}
                      </TableHead>
                      <TableHead>
                        {t("settings.logs.requestColumns.url")}
                      </TableHead>
                      <TableHead>
                        {t("settings.logs.requestColumns.status")}
                      </TableHead>
                      <TableHead>
                        {t("settings.logs.requestColumns.time")}
                      </TableHead>
                      <TableHead className="ll:w-0" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {action.requests.map((request) => (
                      <LogsRequestRow
                        key={request.id}
                        onCopy={onCopyRequest}
                        request={request}
                      />
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="ll:m-0 ll:text-xs ll:text-muted-foreground">
                  {t("settings.logs.noRequests")}
                </p>
              )}
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
};
