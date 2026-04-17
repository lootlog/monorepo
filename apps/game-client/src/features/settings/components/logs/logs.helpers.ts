import {
  ACTION_TYPE_LABEL_KEYS,
  STATUS_LABEL_KEYS,
  type LogStatusFilter,
} from "@/features/settings/components/logs/logs.constants";
import i18n from "@/i18n/config";
import type { LoggedAction, SerializableValue } from "@/store/logs.store";

export const stringifyLogValue = (value: SerializableValue): string => {
  return JSON.stringify(value, null, 2) ?? "";
};

export const formatLogTimestamp = (createdAt: string): string => {
  return new Intl.DateTimeFormat("pl-PL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(createdAt));
};

export const getActionLabel = (actionType: string): string => {
  return i18n.t(ACTION_TYPE_LABEL_KEYS[actionType] ?? actionType);
};

export const getStatusLabel = (
  status: LogStatusFilter | LoggedAction["status"],
): string => {
  if (status === "all") {
    return i18n.t("settings.logs.statuses.all");
  }

  return i18n.t(STATUS_LABEL_KEYS[status]);
};

export const getActionRequestSummary = (action: LoggedAction) => {
  const successCount = action.requests.filter(
    (request) => request.status === "success",
  ).length;
  const failureCount = action.requests.length - successCount;

  return {
    successCount,
    failureCount,
    totalRequests: action.requests.length,
  };
};

export const matchesActionFilters = (
  action: LoggedAction,
  actionTypeFilter: string,
  statusFilter: LogStatusFilter,
  searchTerm: string,
): boolean => {
  if (actionTypeFilter !== "all" && action.actionType !== actionTypeFilter) {
    return false;
  }

  if (statusFilter !== "all" && action.status !== statusFilter) {
    return false;
  }

  const normalizedSearchTerm = searchTerm.trim().toLocaleLowerCase("pl");
  if (!normalizedSearchTerm) {
    return true;
  }

  const searchableText = [
    action.actionType,
    getActionLabel(action.actionType),
    stringifyLogValue(action.payload),
    action.details ? stringifyLogValue(action.details) : "",
    ...action.requests.flatMap((request) => [
      request.method,
      request.endpoint,
      request.status,
      String(request.statusCode ?? ""),
      stringifyLogValue(request.payload),
      stringifyLogValue(request.response),
    ]),
  ]
    .join(" ")
    .toLocaleLowerCase("pl");

  return searchableText.includes(normalizedSearchTerm);
};
