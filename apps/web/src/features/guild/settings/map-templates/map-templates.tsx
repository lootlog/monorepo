import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@lootlog/ui/components/button";
import { FileText, Plus } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { ListToolbar } from "@/components/common/list-toolbar";
import { toast } from "sonner";
import { MapTemplateFormDialog } from "./map-template-form-dialog";
import { MapTemplateRowsSkeleton } from "./map-template-rows-skeleton";
import { MapTemplateTile } from "./map-template-tile";
import { SettingsListEmpty } from "../components/settings-list-empty";
import { SettingsTabPage } from "../components/settings-tab-page";
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

  const { data: templates, isLoading } = useMapTemplatesControllerGetTemplates({
    guildId: guildId ?? "",
  });

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

  const renderContent = () => {
    if (isLoading) {
      return (
        <div role="status" aria-label={t("common.loading")}>
          <MapTemplateRowsSkeleton />
        </div>
      );
    }

    if (filteredTemplates.length === 0) {
      return normalizedSearchValue ? (
        <SettingsListEmpty
          icon={FileText}
          title={t("settings.mapTemplates.noResults")}
          description={t("settings.mapTemplates.noResultsDescription")}
          hasActiveFilters
          onResetFilters={() => setSearchValue("")}
        />
      ) : (
        <div className="p-3">
          <EmptyState
            framed
            icon={FileText}
            title={t("settings.mapTemplates.noTemplates")}
            description={t("settings.mapTemplates.noTemplatesDescription")}
          />
        </div>
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
        disabled={isLoading}
      >
        <Button
          size="sm"
          className="shrink-0"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus data-icon="inline-start" aria-hidden />
          {t("settings.mapTemplates.newTemplate")}
        </Button>
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
