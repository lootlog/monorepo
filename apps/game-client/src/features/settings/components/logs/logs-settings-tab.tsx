import { SettingsEmptyState } from "@/components/settings/settings-empty-state";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsTabLayout } from "@/components/settings/settings-tab-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LOG_STATUS_OPTIONS,
  type LogStatusFilter,
} from "@/features/settings/components/logs/logs.constants";
import { LogsActionCard } from "@/features/settings/components/logs/logs-action-card";
import {
  getActionLabel,
  matchesActionFilters,
} from "@/features/settings/components/logs/logs.helpers";
import {
  useLogsStore,
  type LoggedAction,
  type LoggedApiRequest,
} from "@/store/logs.store";
import { toast } from "sonner";
import { type FC, useState } from "react";

const getLogsExportFileName = (): string => {
  return `lootlog-logs-${new Date().toISOString().replaceAll(":", "-")}.json`;
};

const FILTER_CONTROL_CLASS_NAME = "ll:w-full ll:text-xs";

export const LogsSettingsTab: FC = () => {
  const actions = useLogsStore((state) => state.actions);
  const clearActions = useLogsStore((state) => state.clearActions);
  const [actionTypeFilter, setActionTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<LogStatusFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const actionTypeOptions = [
    { value: "all", label: "Wszystkie akcje" },
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
      toast.error("Nie udało się skopiować logu");
    }
  };

  const handleCopyAction = async (action: LoggedAction) => {
    await copyLog(action, "Akcja skopiowana do schowka");
  };

  const handleCopyRequest = async (request: LoggedApiRequest) => {
    await copyLog(request, "Request skopiowany do schowka");
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

      toast.success("Logi wyeksportowane do pliku");
    } catch {
      toast.error("Nie udało się wyeksportować logów");
    }
  };

  return (
    <SettingsTabLayout
      title="Logi"
      description="Zapisane akcje użytkownika z rozwijanymi wywołaniami API, payloadem, odpowiedzią i statusem."
      actions={
        <div className="ll:flex ll:items-center ll:gap-2">
          <Button
            className="ll:h-6 ll:px-2"
            disabled={filteredActions.length === 0}
            onClick={handleExportLogs}
            type="button"
            variant="ghost"
          >
            Eksportuj JSON
          </Button>
          <Button
            className="ll:h-6 ll:px-2"
            disabled={actions.length === 0}
            onClick={clearActions}
            type="button"
            variant="ghost"
          >
            Wyczyść
          </Button>
        </div>
      }
    >
      <SettingsSection
        title="Filtry"
        description="Zawęź wpisy po typie, statusie lub fragmencie treści."
      >
        <div className="ll:grid ll:grid-cols-1 ll:gap-2 ll:sm:grid-cols-[minmax(0,1fr)_minmax(0,9rem)_minmax(0,9rem)] ll:sm:items-center">
          <div className="ll:min-w-0">
            <Input
              className={FILTER_CONTROL_CLASS_NAME}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Szukaj w logach"
              value={searchTerm}
            />
          </div>
          <div className="ll:min-w-0">
            <Select
              onValueChange={setActionTypeFilter}
              value={actionTypeFilter}
            >
              <SelectTrigger
                aria-label="Typ akcji"
                className={FILTER_CONTROL_CLASS_NAME}
              >
                <SelectValue placeholder="Typ akcji" />
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
                aria-label="Status akcji"
                className={FILTER_CONTROL_CLASS_NAME}
              >
                <SelectValue placeholder="Status akcji" />
              </SelectTrigger>
              <SelectContent>
                {LOG_STATUS_OPTIONS.map((option) => (
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
        title="Lista akcji"
        description={`Widoczne akcje: ${filteredActions.length} z ${actions.length}.`}
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
            Brak akcji pasujących do aktualnych filtrów.
          </SettingsEmptyState>
        )}
      </SettingsSection>
    </SettingsTabLayout>
  );
};
