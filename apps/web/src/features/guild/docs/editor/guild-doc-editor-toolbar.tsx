import { FILTER_PILL_CLASS } from "@/components/common/filter-pill";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { Button } from "@lootlog/ui/components/button";
import { Separator } from "@lootlog/ui/components/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { cn } from "cn";
import type { ReactNode } from "react";
import { GuildDocLinkDialog } from "./guild-doc-link-dialog";
import { GuildDocTableDialog } from "./guild-doc-table-dialog";

import { useGuildDocEditorToolbarModel } from "./use-guild-doc-editor-toolbar-model";

type GuildDocEditorToolbarProps = {
  /** The document's own actions, such as history, after the formatting controls. */
  actions?: ReactNode;
};

/**
 * The first row of the document page, pinned like a list toolbar while the
 * document scrolls under it. On phones the controls scroll sideways instead of
 * stacking rows over the text.
 */
export const GuildDocEditorToolbar = ({
  actions,
}: GuildDocEditorToolbarProps) => {
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
      <div
        data-list-tile
        className={cn(
          "sticky top-(--page-sticky-top) z-10 flex min-h-12 items-center gap-1 backdrop-blur-sm",
          LIST_TILE_RULE_CLASS,
          LIST_TILE_INSET_CLASS,
        )}
      >
        {/*
          The negative margin lines the first icon up with the title below. On
          phones the controls fade out at the end to show there are more.
        */}
        <div className="-ml-3 flex min-w-0 flex-1 items-center gap-1 px-1 py-2 max-sm:overflow-x-auto max-sm:[scrollbar-width:none] max-sm:[mask-image:linear-gradient(to_right,#000_calc(100%-1.5rem),transparent)] sm:flex-wrap max-sm:[&::-webkit-scrollbar]:hidden">
          {controls.map((control) => {
            if ("separator" in control) {
              return (
                <Separator
                  key={control.separator}
                  orientation="vertical"
                  className="mx-1 data-[orientation=vertical]:h-5"
                />
              );
            }

            const Icon = control.icon;

            return (
              <Tooltip key={control.label}>
                <TooltipTrigger
                  render={
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      className={cn(
                        "shrink-0 border border-transparent",
                        FILTER_PILL_CLASS,
                      )}
                      aria-label={control.label}
                      aria-pressed={control.active}
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
        {/* Pinned to the first row while the controls wrap onto a second one. */}
        {actions && (
          <div className="flex shrink-0 items-center gap-1 self-start py-2">
            <Separator
              orientation="vertical"
              className="mx-1 data-[orientation=vertical]:h-5"
            />
            {actions}
          </div>
        )}
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
