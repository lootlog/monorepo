import { Button } from "@lootlog/ui/components/button";
import { Separator } from "@lootlog/ui/components/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
import { GuildDocLinkDialog } from "./guild-doc-link-dialog";
import { GuildDocTableDialog } from "./guild-doc-table-dialog";

import { useGuildDocEditorToolbarModel } from "./use-guild-doc-editor-toolbar-model";

export const GuildDocEditorToolbar: React.FC = () => {
  const {
    controls,
    tableDialogOpen,
    insertTable,
    setTableDialogOpen,
    linkDialogOpen,
    selectedLinkText,
    handleLinkDialogOpenChange,
    submitLink,
  } = useGuildDocEditorToolbarModel();
  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border bg-muted/30 p-2">
        {controls.map((control) => {
          if ("separator" in control) {
            return (
              <Separator
                key={control.separator}
                orientation="vertical"
                className="mx-1 h-6"
              />
            );
          }

          const Icon = control.icon;
          const isActive = control.active === true;

          return (
            <Tooltip key={control.label}>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "relative h-8 w-8 border border-transparent text-muted-foreground transition-colors",
                      "hover:bg-muted hover:text-foreground",
                      isActive &&
                        "border-primary/70 bg-primary/25 text-primary shadow-sm ring-1 ring-primary/30 hover:bg-primary/30 hover:text-primary after:absolute after:bottom-1 after:left-1/2 after:h-0.5 after:w-4 after:-translate-x-1/2 after:rounded-full after:bg-primary",
                    )}
                    aria-label={control.label}
                    aria-pressed={
                      control.active === undefined ? undefined : control.active
                    }
                    onClick={control.action}
                  >
                    <Icon className="size-4" />
                  </Button>
                }
              />
              <TooltipContent side="bottom">
                <p>{control.label}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <GuildDocTableDialog
        open={tableDialogOpen}
        onInsert={insertTable}
        onOpenChange={setTableDialogOpen}
      />
      <GuildDocLinkDialog
        open={linkDialogOpen}
        selectedText={selectedLinkText}
        onOpenChange={handleLinkDialogOpenChange}
        onSubmit={submitLink}
      />
    </>
  );
};
