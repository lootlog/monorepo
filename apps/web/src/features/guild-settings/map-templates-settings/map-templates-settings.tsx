import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@lootlog/ui/components/card";
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
import { useMapTemplates, type MapTemplate } from "./hooks/use-map-templates";
import { useDeleteMapTemplate } from "./hooks/use-map-template-mutations";
import { MapTemplatesHeader } from "./map-templates-header";
import { MapTemplateFormDialog } from "./map-template-form-dialog";
import { Spinner } from "@lootlog/ui/components/spinner";

export const MapTemplatesSettings = () => {
  const { t } = useTranslation();
  const { data: templates, isLoading } = useMapTemplates();
  const deleteTemplate = useDeleteMapTemplate();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MapTemplate | null>(
    null,
  );
  const [expandedTemplates, setExpandedTemplates] = useState<
    Record<string, boolean>
  >({});

  const toggleExpanded = (templateId: string) => {
    setExpandedTemplates((prev) => ({
      ...prev,
      [templateId]: !prev[templateId],
    }));
  };

  const handleEdit = (template: MapTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTemplate(template);
    setEditDialogOpen(true);
  };

  const handleDelete = async (templateId: string) => {
    try {
      await deleteTemplate.mutateAsync(templateId);
      toast.success(t("settings.mapTemplates.toasts.deleted"));
    } catch {
      toast.error(t("settings.mapTemplates.toasts.deleteError"));
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <MapTemplatesHeader onAddClick={() => setCreateDialogOpen(true)} />
      <ScrollArea className="flex-1 min-h-0 bg-background/50">
        <div className="p-3 flex flex-col gap-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Spinner className="h-8 w-8" />
            </div>
          ) : templates?.length === 0 ? (
            <Card className="flex flex-col items-center justify-center h-64 gap-4 bg-card/40 backdrop-blur-sm">
              <FileText className="w-16 h-16 text-muted-foreground" />
              <p className="text-muted-foreground">
                {t("settings.mapTemplates.noTemplates")}
              </p>
            </Card>
          ) : (
            templates?.map((template: MapTemplate) => (
              <Collapsible
                key={template.id}
                open={expandedTemplates[template.id]}
                onOpenChange={() => toggleExpanded(template.id)}
              >
                <div className="rounded-lg border bg-card/40 backdrop-blur-sm overflow-hidden">
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileText className="size-4 text-primary" />
                      </div>
                      <div className="text-left">
                        <span className="font-semibold text-sm">
                          {template.name}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {t("settings.mapTemplates.mapCount", {
                            count: template.maps.length,
                          })}
                        </span>
                      </div>
                    </div>
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
                      <ChevronDown
                        className={`size-4 text-muted-foreground transition-transform ml-1 ${
                          expandedTemplates[template.id] ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-2 border-t">
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
                    </div>
                  </CollapsibleContent>
                </div>
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
