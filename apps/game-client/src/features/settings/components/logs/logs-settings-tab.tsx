import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LOG_STATUS_VALUES,
  type LogStatusFilter,
} from "@/features/settings/components/logs/logs.constants";
import { LogsActionRow } from "@/features/settings/components/logs/logs-action-row";
import {
  getActionLabel,
  getStatusLabel,
  matchesActionFilters,
} from "@/features/settings/components/logs/logs.helpers";
import {
  useLogsStore,
  type LoggedAction,
  type LoggedApiRequest,
} from "@/store/logs.store";
import { useSettingsStore } from "@/store/settings.store";
import { toast } from "sonner";
import { type FC, useState } from "react";
import { useTranslation } from "react-i18next";

const getLogsExportFileName = (): string => {
  return `lootlog-logs-${new Date().toISOString().replaceAll(":", "-")}.json`;
};

const FILTER_CONTROL_CLASS_NAME = "ll:w-36";

export const LogsSettingsTab: FC = () => {
  const actions = useLogsStore((state) => state.actions);
  const clearActions = useLogsStore((state) => state.clearActions);

  const lootDebugLoggingEnabled = useSettingsStore(
    (state) => state.lootDebugLoggingEnabled,
  );

  const setLootDebugLoggingEnabled = useSettingsStore(
    (state) => state.setLootDebugLoggingEnabled,
  );

  const [actionTypeFilter, setActionTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<LogStatusFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { t } = useTranslation();

  const logStatusOptions = LOG_STATUS_VALUES.map((value) => ({
    value,
    label:
      value === "all" ? t("settings.logs.statuses.all") : getStatusLabel(value),
  }));

  const actionTypeOptions = [
    { value: "all", label: t("settings.logs.allActions") },
    ...Array.from(new Set(actions.map((action) => action.actionType)))
      .sort((left, right) =>
        getActionLabel(left).localeCompare(getActionLabel(right), "pl"),
      )
      .map((actionType) => ({
        value: actionType,
        label: getActionLabel(actionType),
      })),
  ];

  const filteredActions = [...actions]
    .reverse()
    .filter((action) =>
      matchesActionFilters(action, actionTypeFilter, statusFilter, searchTerm),
    );

  const copyLog = async (
    log: LoggedAction | LoggedApiRequest,
    successMessage: string,
  ) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(log, null, 2));
      toast.success(successMessage);
    } catch {
      toast.error(t("settings.logs.copyFailed"));
    }
  };

  const handleCopyAction = async (action: LoggedAction) => {
    await copyLog(action, t("settings.logs.copyActionSuccess"));
  };

  const handleCopyRequest = async (request: LoggedApiRequest) => {
    await copyLog(request, t("settings.logs.copyRequestSuccess"));
  };

  const handleExportLogs = () => {
    try {
      const exportPayload = {
        exportedAt: new Date().toISOString(),
        filters: {
          actionType: actionTypeFilter,
          status: statusFilter,
          searchTerm,
        },
        actions: filteredActions,
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: "application/json",
      });

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = getLogsExportFileName();
      document.body.append(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success(t("settings.logs.exportSuccess"));
    } catch {
      toast.error(t("settings.logs.exportFailed"));
    }
  };

  return (
    <SettingsTabLayout>
      <SettingsSection title={t("settings.logs.consoleDebugTitle")}>
        <SettingsRow
          controlId="loot-debug-logging"
          htmlFor="loot-debug-logging"
          label={t("settings.logs.lootDebugLoggingLabel")}
          description={t("settings.logs.lootDebugLoggingDescription")}
        >
          <Switch
            checked={lootDebugLoggingEnabled}
            id="loot-debug-logging"
            onCheckedChange={setLootDebugLoggingEnabled}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        controlId="logs-list"
        title={t("settings.logs.listTitle")}
        description={t("settings.logs.listDescription", {
          visibleCount: filteredActions.length,
          totalCount: actions.length,
        })}
        actions={
          <div className="ll:flex ll:items-center ll:gap-2">
            <Button
              size="sm"
              disabled={filteredActions.length === 0}
              onClick={handleExportLogs}
              type="button"
              variant="outline"
            >
              {t("common:actions.exportJson")}
            </Button>
            <Button
              size="sm"
              disabled={actions.length === 0}
              onClick={clearActions}
              type="button"
              variant="outline"
            >
              {t("common:actions.clear")}
            </Button>
          </div>
        }
      >
        <div className="ll:flex ll:flex-wrap ll:items-center ll:gap-2 ll:px-2 ll:pt-2 ll:pb-1">
          <SearchInput
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={t("settings.logs.searchPlaceholder")}
            value={searchTerm}
          />
          <Select onValueChange={setActionTypeFilter} value={actionTypeFilter}>
            <SelectTrigger
              aria-label={t("settings.logs.actionTypeAria")}
              className={FILTER_CONTROL_CLASS_NAME}
            >
              <SelectValue
                placeholder={t("settings.logs.actionTypePlaceholder")}
              />
            </SelectTrigger>
            <SelectContent>
              {actionTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            onValueChange={(value) =>
              setStatusFilter(
                LOG_STATUS_VALUES.find((status) => status === value) ?? "all",
              )
            }
            value={statusFilter}
          >
            <SelectTrigger
              aria-label={t("settings.logs.statusAria")}
              className={FILTER_CONTROL_CLASS_NAME}
            >
              <SelectValue placeholder={t("settings.logs.statusPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {logStatusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {filteredActions.length > 0 ? (
          <div className="ll:px-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("settings.logs.columns.time")}</TableHead>
                  <TableHead>{t("settings.logs.columns.action")}</TableHead>
                  <TableHead>{t("settings.logs.columns.status")}</TableHead>
                  <TableHead className="ll:w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActions.map((action) => (
                  <LogsActionRow
                    action={action}
                    key={action.id}
                    onCopyAction={handleCopyAction}
                    onCopyRequest={handleCopyRequest}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <SettingsEmptyState>
            {t("settings.logs.emptyState")}
          </SettingsEmptyState>
        )}
      </SettingsSection>
    </SettingsTabLayout>
  );
};
