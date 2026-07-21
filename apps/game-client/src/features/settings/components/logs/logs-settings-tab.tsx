import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsControlRow } from "@/components/settings/settings-control-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { LogsActionCard } from "@/features/settings/components/logs/logs-action-card";
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

const FILTER_CONTROL_CLASS_NAME = "ll:w-full ll:text-xs";

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
    <SettingsTabLayout
      title={t("settings.logs.title")}
      description={t("settings.logs.description")}
      actions={
        <div className="ll:flex ll:items-center ll:gap-2">
          <Button
            className="ll:h-6 ll:px-2"
            disabled={filteredActions.length === 0}
            onClick={handleExportLogs}
            type="button"
            variant="ghost"
          >
            {t("common:actions.exportJson")}
          </Button>
          <Button
            className="ll:h-6 ll:px-2"
            disabled={actions.length === 0}
            onClick={clearActions}
            type="button"
            variant="ghost"
          >
            {t("common:actions.clear")}
          </Button>
        </div>
      }
    >
      <SettingsSection title={t("settings.logs.consoleDebugTitle")}>
        <SettingsControlRow
          label={t("settings.logs.lootDebugLoggingLabel")}
          description={t("settings.logs.lootDebugLoggingDescription")}
        >
          <Switch
            checked={lootDebugLoggingEnabled}
            id="loot-debug-logging"
            onCheckedChange={setLootDebugLoggingEnabled}
          />
        </SettingsControlRow>
      </SettingsSection>

      <SettingsSection
        title={t("settings.logs.filtersTitle")}
        description={t("settings.logs.filtersDescription")}
      >
        <div className="ll:grid ll:grid-cols-1 ll:gap-2 ll:sm:grid-cols-[minmax(0,1fr)_minmax(0,9rem)_minmax(0,9rem)] ll:sm:items-center">
          <div className="ll:min-w-0">
            <Input
              className={FILTER_CONTROL_CLASS_NAME}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t("settings.logs.searchPlaceholder")}
              value={searchTerm}
            />
          </div>
          <div className="ll:min-w-0">
            <Select
              onValueChange={setActionTypeFilter}
              value={actionTypeFilter}
            >
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
          </div>
          <div className="ll:min-w-0">
            <Select
              onValueChange={(value) =>
                setStatusFilter(value as LogStatusFilter)
              }
              value={statusFilter}
            >
              <SelectTrigger
                aria-label={t("settings.logs.statusAria")}
                className={FILTER_CONTROL_CLASS_NAME}
              >
                <SelectValue
                  placeholder={t("settings.logs.statusPlaceholder")}
                />
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
        </div>
      </SettingsSection>

      <SettingsSection
        title={t("settings.logs.listTitle")}
        description={t("settings.logs.listDescription", {
          visibleCount: filteredActions.length,
          totalCount: actions.length,
        })}
      >
        {filteredActions.length > 0 ? (
          <div className="ll:flex ll:flex-col ll:gap-2">
            {filteredActions.map((action) => (
              <LogsActionCard
                action={action}
                key={action.id}
                onCopyAction={handleCopyAction}
                onCopyRequest={handleCopyRequest}
              />
            ))}
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
