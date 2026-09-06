import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCard } from "@/components/common/section-card/section-card";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@lootlog/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@lootlog/ui/components/collapsible";
import { FileText, MapPin, Trash2, Pencil, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import { MapTemplatesHeader } from "./map-templates-header";
import { MapTemplateFormDialog } from "./map-template-form-dialog";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  invalidateMapTemplatesControllerGetTemplates,
  useMapTemplatesControllerDeleteTemplate,
  useMapTemplatesControllerGetTemplates,
} from "@lootlog/client/main";
import type { MapTemplateResponseDto } from "@lootlog/client/main";

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
  const [expandedTemplates, setExpandedTemplates] = useState<
    Record<string, boolean>
  >({});

  const toggleExpanded = (templateId: string) => {
    setExpandedTemplates((prev) => ({
      ...prev,
      [templateId]: !prev[templateId],
    }));
  };

  const handleEdit = (
    template: MapTemplateResponseDto,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
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

  return (
    <div className="flex flex-col h-full min-h-0 overflow-y-auto">
      <MapTemplatesHeader onAddClick={() => setCreateDialogOpen(true)} />
      <ScrollArea className="flex-1 min-h-48 bg-background">
        <div className="p-3 flex flex-col gap-3">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <SectionCard key={i}>
                  <SectionCardContent className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-5 w-8 rounded-full" />
                    </div>
                  </SectionCardContent>
                </SectionCard>
              ))}
            </div>
          ) : templates?.length === 0 ? (
            <SectionCard className="flex flex-col items-center justify-center h-64">
              <SectionCardContent className="flex flex-col gap-3">
                <FileText className="w-16 h-16 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {t("settings.mapTemplates.noTemplates")}
                </p>
              </SectionCardContent>
            </SectionCard>
          ) : (
            templates?.map((template: MapTemplateResponseDto) => (
              <Collapsible
                key={template.id}
                open={expandedTemplates[template.id]}
                onOpenChange={() => toggleExpanded(template.id)}
              >
                <SectionCard className="overflow-hidden">
                  <SectionCardHeader
                    icon={FileText}
                    title={
                      <CollapsibleTrigger className="text-left">
                        {template.name}
                      </CollapsibleTrigger>
                    }
                    description={t("settings.mapTemplates.mapCount", {
                      count: template.maps.length,
                    })}
                    actions={
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={(e) => handleEdit(template, e)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <ConfirmDeleteDialog
                          onConfirm={() => handleDelete(template.id)}
                          title={t("settings.mapTemplates.deleteConfirmTitle")}
                          description={t(
                            "settings.mapTemplates.deleteConfirmDescription",
                            { name: template.name },
                          )}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          }
                        />
                        <CollapsibleTrigger
                          aria-label={template.name}
                          className="p-2"
                        >
                          <ChevronDown
                            className={`size-4 text-muted-foreground transition-transform ${expandedTemplates[template.id] ? "rotate-180" : ""}`}
                          />
                        </CollapsibleTrigger>
                      </div>
                    }
                  />
                  <CollapsibleContent>
                    <SectionCardContent>
                      <div className="flex flex-wrap gap-2">
                        {template.maps.map((map, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary text-xs rounded"
                          >
                            <MapPin className="w-3 h-3" />
                            {map.name}
                            <span className="text-muted-foreground">
                              ({map.id})
                            </span>
                          </span>
                        ))}
                      </div>
                    </SectionCardContent>
                  </CollapsibleContent>
                </SectionCard>
              </Collapsible>
            ))
          )}
        </div>
      </ScrollArea>

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
    </div>
  );
};
