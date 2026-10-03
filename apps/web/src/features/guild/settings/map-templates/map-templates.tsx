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
import {
  ChevronRight,
  FileText,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "cn";
import { EmptyState } from "@/components/common/empty-state";
import { toast } from "sonner";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import { MapTemplateFormDialog } from "./map-template-form-dialog";
import { MapTemplateRowsSkeleton } from "./map-template-rows-skeleton";
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

  const [expandedTemplates, setExpandedTemplates] = useState<
    Record<string, boolean>
  >({});

  const toggleExpanded = (templateId: string) => {
    setExpandedTemplates((prev) => ({
      ...prev,
      [templateId]: !prev[templateId],
    }));
  };

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

  const createButton = (
    <Button onClick={() => setCreateDialogOpen(true)}>
      <Plus data-icon="inline-start" aria-hidden />
      {t("settings.mapTemplates.newTemplate")}
    </Button>
  );

  const isEmpty = !isLoading && templates?.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <h1 className="sr-only">{t("settings.mapTemplates.title")}</h1>
      <ScrollArea className="min-h-48 flex-1">
        <div className="flex flex-col gap-3 px-3 pb-3">
          <SectionCard>
            <SectionCardHeader
              icon={FileText}
              title={t("settings.mapTemplates.title")}
              description={t("settings.mapTemplates.description")}
              actions={!isEmpty && createButton}
            />
            <SectionCardContent className="p-0">
              {isLoading ? (
                <div role="status" aria-label={t("common.loading")}>
                  <MapTemplateRowsSkeleton />
                </div>
              ) : isEmpty ? (
                <EmptyState
                  icon={FileText}
                  title={t("settings.mapTemplates.noTemplates")}
                  description={t(
                    "settings.mapTemplates.noTemplatesDescription",
                  )}
                  action={createButton}
                />
              ) : (
                <ul className="divide-y divide-border">
                  {templates?.map((template) => {
                    const isExpanded = expandedTemplates[template.id] ?? false;

                    return (
                      <li key={template.id}>
                        <Collapsible
                          open={isExpanded}
                          onOpenChange={() => toggleExpanded(template.id)}
                        >
                          <div className="flex min-h-14 items-center gap-1 pr-3 transition-colors hover:bg-muted/40">
                            <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-3 self-stretch py-2 pl-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                              <ChevronRight
                                aria-hidden
                                className={cn(
                                  "size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none",
                                  isExpanded && "rotate-90",
                                )}
                              />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold">
                                  {template.name}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                  {t("settings.mapTemplates.mapCount", {
                                    count: template.maps.length,
                                  })}
                                </span>
                              </span>
                            </CollapsibleTrigger>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t(
                                "settings.mapTemplates.editTemplate",
                                {
                                  name: template.name,
                                },
                              )}
                              className="size-8"
                              onClick={() => handleEdit(template)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <ConfirmDeleteDialog
                              onConfirm={() => handleDelete(template.id)}
                              title={t(
                                "settings.mapTemplates.deleteConfirmTitle",
                              )}
                              description={t(
                                "settings.mapTemplates.deleteConfirmDescription",
                                { name: template.name },
                              )}
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={t(
                                    "settings.mapTemplates.deleteTemplate",
                                    { name: template.name },
                                  )}
                                  className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              }
                            />
                          </div>
                          <CollapsibleContent>
                            <ul className="flex flex-wrap gap-2 px-3 pb-3 pl-10">
                              {template.maps.map((map) => (
                                <li
                                  key={map.id}
                                  className="inline-flex items-center gap-1.5 rounded bg-primary/10 px-2 py-1 text-xs text-primary"
                                >
                                  <MapPin className="size-3" aria-hidden />
                                  {map.name}
                                  <span className="text-muted-foreground">
                                    ({map.id})
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </CollapsibleContent>
                        </Collapsible>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCardContent>
          </SectionCard>
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
