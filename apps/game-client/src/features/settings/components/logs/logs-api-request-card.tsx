import { Button } from "@/components/ui/button";
import {
  formatLogTimestamp,
  getStatusLabel,
  stringifyLogValue,
} from "@/features/settings/components/logs/logs.helpers";
import { cn } from "@/lib/utils";
import type { LoggedApiRequest } from "@/store/logs.store";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type LogsApiRequestCardProps = {
  request: LoggedApiRequest;
  onCopy: (request: LoggedApiRequest) => void;
};

const STATUS_CLASS_NAMES = {
  success: "ll:border-emerald-500/40 ll:bg-emerald-500/10 ll:text-emerald-200",
  error: "ll:border-red-500/40 ll:bg-red-500/10 ll:text-red-200",
} as const;

export const LogsApiRequestCard: FC<LogsApiRequestCardProps> = ({
  request,
  onCopy,
}) => {
  const { t } = useTranslation();

  return (
    <div className="ll:rounded-md ll:border ll:border-gray-700/80 ll:bg-black/20 ll:p-3">
      <div className="ll:flex ll:flex-wrap ll:items-start ll:justify-between ll:gap-2">
        <div className="ll:min-w-0 ll:flex-1">
          <div className="ll:flex ll:flex-wrap ll:items-center ll:gap-1.5">
            <span className="ll:text-[12px] ll:font-semibold ll:text-white">
              {request.method} {request.endpoint}
            </span>
            <span
              className={cn(
                "ll:rounded-sm ll:border ll:px-1.5 ll:py-0.5 ll:text-[10px] ll:font-medium",
                STATUS_CLASS_NAMES[request.status],
              )}
            >
              {getStatusLabel(request.status)}
            </span>
          </div>
          <div className="ll:mt-1 ll:flex ll:flex-wrap ll:items-center ll:gap-x-3 ll:gap-y-1 ll:text-[10px] ll:text-gray-400">
            <span>{formatLogTimestamp(request.createdAt)}</span>
            <span>
              {t("settings.logs.statusCode", {
                statusCode: request.statusCode ?? "-",
              })}
            </span>
          </div>
        </div>
        <Button
          className="ll:h-6 ll:px-2"
          onClick={() => onCopy(request)}
          type="button"
        >
          {t("common:actions.copyRequest")}
        </Button>
      </div>

      <div className="ll:mt-3 ll:grid ll:gap-2 ll:md:grid-cols-2">
        <div className="ll:flex ll:min-w-0 ll:flex-col ll:gap-1">
          <span className="ll:text-[11px] ll:font-semibold ll:text-gray-300">
            {t("settings.logs.payload")}
          </span>
          <pre className="ll:m-0 ll:max-h-48 ll:overflow-auto ll:rounded-sm ll:border ll:border-gray-700/80 ll:bg-black/30 ll:px-2 ll:py-2 ll:text-[11px] ll:leading-4 ll:text-gray-200">
            {stringifyLogValue(request.payload)}
          </pre>
        </div>
        <div className="ll:flex ll:min-w-0 ll:flex-col ll:gap-1">
          <span className="ll:text-[11px] ll:font-semibold ll:text-gray-300">
            {t("settings.logs.response")}
          </span>
          <pre className="ll:m-0 ll:max-h-48 ll:overflow-auto ll:rounded-sm ll:border ll:border-gray-700/80 ll:bg-black/30 ll:px-2 ll:py-2 ll:text-[11px] ll:leading-4 ll:text-gray-200">
            {stringifyLogValue(request.response)}
          </pre>
        </div>
      </div>
    </div>
  );
};
