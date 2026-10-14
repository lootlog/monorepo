import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@lootlog/ui/components/button";
import { FileText, Plus, SearchX } from "lucide-react";
import { ListToolbar } from "@/components/common/list-toolbar";
import { toast } from "sonner";
import { MapTemplateFormDialog } from "./map-template-form-dialog";
import { MapTemplateRowsSkeleton } from "./map-template-rows-skeleton";
import { MapTemplateTile } from "./map-template-tile";
import { SettingsClearFilterButton } from "@/components/common/settings-clear-filter-button";
import { SettingsListEmpty } from "@/components/common/settings-list-empty";
import { SettingsListError } from "@/components/common/settings-list-error";
import { SettingsTabPage } from "@/components/common/settings-tab-page";
import { useQueryClient } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  invalidateMapTemplatesControllerGetTemplates,
  useMapTemplatesControllerDeleteTemplate,
  useMapTemplatesControllerGetTemplates,
  type MapTemplateResponseDto,
} from "@lootlog/client/main";

export const MapTemplatesSettings = () => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const queryClient = useQueryClient();

  const {
    data: templates,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useMapTemplatesControllerGetTemplates({ guildId: guildId ?? "" });

  const deleteTemplate = useMapTemplatesControllerDeleteTemplate({
    mutation: {
      onSuccess: async () => {
        if (!guildId) {
          return;
        }

        await invalidateMapTemplatesControllerGetTemplates(queryClient, {
          guildId,
        });
      },
    },
  });

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [editingTemplate, setEditingTemplate] =
    useState<MapTemplateResponseDto | null>(null);

  const [searchValue, setSearchValue] = useState("");
  const normalizedSearchValue = searchValue.trim().toLowerCase();

  const filteredTemplates = (templates ?? []).filter((template) =>
    template.name.toLowerCase().includes(normalizedSearchValue),
  );

  const handleEdit = (template: MapTemplateResponseDto) => {
    setEditingTemplate(template);
    setEditDialogOpen(true);
  };

  const handleDelete = async (templateId: string) => {
    if (!guildId) {
      toast.error(t("settings.mapTemplates.toasts.deleteError"));
      throw new Error("Missing guild id.");
    }

    try {
      await deleteTemplate.mutateAsync({
        pathParams: { guildId, templateId },
      });
      toast.success(t("settings.mapTemplates.toasts.deleted"));
    } catch (error) {
      toast.error(t("settings.mapTemplates.toasts.deleteError"));
      throw error;
    }
  };

  const hasTemplates = Boolean(templates?.length);

  // Small in the toolbar, regular as the empty state's call to action.
  const renderCreateButton = (size?: "sm") => (
    <Button
      size={size}
      className="shrink-0"
      onClick={() => setCreateDialogOpen(true)}
    >
      <Plus data-icon="inline-start" aria-hidden />
      {t("settings.mapTemplates.newTemplate")}
    </Button>
  );

  const renderContent = () => {
    if (!templates && isError) {
      return (
        <SettingsListError
          title={t("settings.mapTemplates.loadError")}
          isRetrying={isFetching}
          onRetry={() => void refetch()}
        />
      );
    }

    if (isLoading) {
      return (
        <div role="status" aria-label={t("common.loading")}>
          <MapTemplateRowsSkeleton />
        </div>
      );
    }

    // The first template starts here; the toolbar offers it once there is a list.
    if (!hasTemplates) {
      return (
        <SettingsListEmpty
          icon={FileText}
          title={t("settings.mapTemplates.noTemplates")}
          description={t("settings.mapTemplates.noTemplatesDescription")}
          action={renderCreateButton()}
        />
      );
    }

    if (filteredTemplates.length === 0) {
      return (
        <SettingsListEmpty
          icon={SearchX}
          title={t("settings.mapTemplates.noResults", {
            query: searchValue.trim(),
          })}
          description={t("settings.mapTemplates.noResultsDescription")}
          action={
            <SettingsClearFilterButton onClear={() => setSearchValue("")} />
          }
        />
      );
    }

    return (
      <ul>
        {filteredTemplates.map((template) => (
          <MapTemplateTile
            key={template.id}
            template={template}
            onEdit={() => handleEdit(template)}
            onDelete={() => handleDelete(template.id)}
          />
        ))}
      </ul>
    );
  };

  return (
    <SettingsTabPage title={t("settings.mapTemplates.title")}>
      <ListToolbar
        search={searchValue}
        onSearchChange={setSearchValue}
        placeholder={t("settings.mapTemplates.filterPlaceholder")}
        label={t("settings.mapTemplates.filterPlaceholder")}
        clearLabel={t("settings.clearFilter")}
        disabled={!hasTemplates}
      >
        {hasTemplates && renderCreateButton("sm")}
      </ListToolbar>
      {renderContent()}

      <MapTemplateFormDialog
        mode="create"
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {editingTemplate && (
        <MapTemplateFormDialog
          mode="edit"
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          template={editingTemplate}
        />
      )}
    </SettingsTabPage>
  );
};
