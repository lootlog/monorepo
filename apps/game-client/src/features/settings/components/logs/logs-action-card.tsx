import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { LogsApiRequestCard } from "@/features/settings/components/logs/logs-api-request-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatLogTimestamp,
  getActionLabel,
  getActionRequestSummary,
  getStatusLabel,
  stringifyLogValue,
} from "@/features/settings/components/logs/logs.helpers";
import { cn } from "@/lib/utils";
import { ChevronDown, Copy } from "lucide-react";
import type { LoggedAction, LoggedApiRequest } from "@/store/logs.store";
import { useState, type FC, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

type LogsActionCardProps = {
  action: LoggedAction;
  onCopyAction: (action: LoggedAction) => void;
  onCopyRequest: (request: LoggedApiRequest) => void;
};

const STATUS_CLASS_NAMES = {
  success: "ll:border-emerald-500/40 ll:bg-emerald-500/10 ll:text-emerald-200",
  partial: "ll:border-amber-500/40 ll:bg-amber-500/10 ll:text-amber-200",
  error: "ll:border-red-500/40 ll:bg-red-500/10 ll:text-red-200",
} as const;

export const LogsActionCard: FC<LogsActionCardProps> = ({
  action,
  onCopyAction,
  onCopyRequest,
}) => {
  const requestSummary = getActionRequestSummary(action);
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();
  const toggleOpen = () => {
    setIsOpen((currentIsOpen) => !currentIsOpen);
  };
  const handleHeaderKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    toggleOpen();
  };

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="ll:group ll:rounded-md ll:border ll:border-gray-600 ll:bg-gray-900/70 ll:transition-colors"
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-label={getActionLabel(action.actionType)}
        className="ll:flex ll:items-center ll:gap-2.5 ll:p-2 ll:transition-colors group-hover:ll:bg-white/4 ll:cursor-pointer"
        onClick={toggleOpen}
        onKeyDown={handleHeaderKeyDown}
      >
        <div className="ll:min-w-0 ll:flex-1 ll:px-2 ll:py-2">
          <div className="ll:min-w-0 ll:flex-1 ll:text-left">
            <div className="ll:flex ll:flex-wrap ll:items-center ll:gap-1.5">
              <span className="ll:text-[12px] ll:font-semibold ll:text-white">
                {getActionLabel(action.actionType)}
              </span>
              <span
                className={cn(
                  "ll:rounded-sm ll:border ll:px-1.5 ll:py-0.5 ll:text-[10px] ll:font-medium",
                  STATUS_CLASS_NAMES[action.status],
                )}
              >
                {getStatusLabel(action.status)}
              </span>
              <span className="ll:rounded-sm ll:border ll:border-gray-500/50 ll:bg-black/20 ll:px-1.5 ll:py-0.5 ll:text-[10px] ll:font-medium ll:text-gray-300">
                {t("settings.logs.requestsCount", {
                  count: requestSummary.totalRequests,
                })}
              </span>
            </div>
            <div className="ll:mt-1 ll:flex ll:flex-wrap ll:items-center ll:gap-x-3 ll:gap-y-1 ll:text-[10px] ll:text-gray-400">
              <span>{formatLogTimestamp(action.createdAt)}</span>
              <span>{action.actionType}</span>
              <span>
                {t("settings.logs.successCount", {
                  count: requestSummary.successCount,
                })}
              </span>
              <span>
                {t("settings.logs.errorCount", {
                  count: requestSummary.failureCount,
                })}
              </span>
            </div>
          </div>
        </div>
        <div className="ll:flex ll:shrink-0 ll:items-center ll:gap-2.5 ll:pl-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label={t("settings.common.actions.copyAction")}
                className="ll:size-7 ll:px-0"
                onClick={(event) => {
                  event.stopPropagation();
                  onCopyAction(action);
                }}
                type="button"
              >
                <Copy size={12} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="ll:z-500">
              <p className="ll:text-xs ll:font-semibold">
                {t("settings.common.actions.copyAction")}
              </p>
            </TooltipContent>
          </Tooltip>
          <Button
            type="button"
            variant="ghost"
            className="ll:size-7 ll:border-gray-600/70 ll:bg-black/20 ll:px-0 ll:hover:bg-white/8"
            aria-label={t("settings.logs.toggleActionDetails")}
            onClick={(event) => {
              event.stopPropagation();
              toggleOpen();
            }}
          >
            <ChevronDown
              size={14}
              className={cn(
                "ll:transition-transform ll:duration-200",
                isOpen && "ll:rotate-180",
              )}
            />
          </Button>
        </div>
      </div>

      <CollapsibleContent className="ll:border-t ll:border-gray-700/80">
        <div className="ll:flex ll:flex-col ll:gap-3">
          <div className="ll:grid ll:gap-2 ll:md:grid-cols-2">
            <div className="ll:flex ll:min-w-0 ll:flex-col ll:gap-1">
              <span className="ll:text-[11px] ll:font-semibold ll:text-gray-300">
                {t("settings.logs.actionPayload")}
              </span>
              <pre className="ll:m-0 ll:max-h-48 ll:overflow-auto ll:rounded-sm ll:border ll:border-gray-700/80 ll:bg-black/30 ll:px-2 ll:py-2 ll:text-[11px] ll:leading-4 ll:text-gray-200">
                {stringifyLogValue(action.payload)}
              </pre>
            </div>
            <div className="ll:flex ll:min-w-0 ll:flex-col ll:gap-1">
              <span className="ll:text-[11px] ll:font-semibold ll:text-gray-300">
                {t("settings.logs.actionDetails")}
              </span>
              <pre className="ll:m-0 ll:max-h-48 ll:overflow-auto ll:rounded-sm ll:border ll:border-gray-700/80 ll:bg-black/30 ll:px-2 ll:py-2 ll:text-[11px] ll:leading-4 ll:text-gray-200">
                {stringifyLogValue(action.details ?? null)}
              </pre>
            </div>
          </div>

          <div className="ll:flex ll:flex-col ll:gap-2">
            {action.requests.length > 0 ? (
              action.requests.map((request) => (
                <LogsApiRequestCard
                  key={request.id}
                  onCopy={onCopyRequest}
                  request={request}
                />
              ))
            ) : (
              <div className="ll:rounded-md ll:border ll:border-dashed ll:border-gray-700 ll:px-3 ll:py-4 ll:text-[11px] ll:text-gray-400">
                {t("settings.logs.noRequests")}
              </div>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
