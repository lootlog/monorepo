import { cn } from "cn";
import { MemberIdentity } from "@/components/common/member-identity";
import { MetaItem } from "@/components/common/meta-item";
import {
  getListTileLinkClassName,
  LIST_TILE_ACTIONS_CLASS,
  LIST_TILE_RULE_CLASS,
  LIST_TILE_HOVER_CLASS,
} from "@/components/common/list-tile";
import { timestampToDate } from "@/utils/date/parse-timestamp-to-date";
import type { GuildDocumentListResponseDtoItemsItem } from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import { Link } from "@tanstack/react-router";
import { Clock3, FileText, History, PenLine, Trash2 } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

type GuildDocTileProps = {
  guildId: string;
  document: GuildDocumentListResponseDtoItemsItem;
  /** Offers moving the document to the trash. */
  canWrite: boolean;
  trashDisabled: boolean;
  onTrash: () => void;
};

/** One document in the edge-to-edge document list; the tile opens it. */
export const GuildDocTile = ({
  guildId,
  document,
  canWrite,
  trashDisabled,
  onTrash,
}: GuildDocTileProps) => {
  const { t } = useTranslation();
  const editorName = document.updatedBy.name ?? t("docs.list.unknownEditor");
  const contentId = useId();

  return (
    <div data-list-tile className={LIST_TILE_RULE_CLASS}>
      <div
        className={cn(
          "relative flex h-full items-center",
          LIST_TILE_HOVER_CLASS,
        )}
      >
        {/* The tile opens the document; the editor's name opens their profile. */}
        <Link
          to="/$guildId/docs/$docId"
          params={{ guildId, docId: document.id }}
          aria-labelledby={contentId}
          className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        />
        <div
          id={contentId}
          className={cn(
            getListTileLinkClassName(canWrite),
            "pointer-events-none relative",
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <FileText aria-hidden className="size-4 text-muted-foreground" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-sm font-semibold">
              {document.title}
            </span>
            <span className="flex min-w-0 items-center gap-x-3">
              <MetaItem
                icon={PenLine}
                label={t("docs.list.editorLabel")}
                className="min-w-0"
              >
                <MemberIdentity
                  member={{ discordId: document.updatedBy.memberId }}
                  fallback={{ name: editorName }}
                  display="name"
                  className="pointer-events-auto"
                  nameClassName="text-xs leading-tight font-normal"
                />
              </MetaItem>
              <MetaItem
                icon={Clock3}
                label={t("docs.list.updatedAtLabel")}
                className="shrink-0"
              >
                {timestampToDate(document.updatedAt)}
              </MetaItem>
              <MetaItem icon={History} className="shrink-0 max-sm:hidden">
                {t("docs.list.version", { version: document.version })}
              </MetaItem>
            </span>
          </span>
        </div>
        {canWrite && (
          <div className={cn("relative", LIST_TILE_ACTIONS_CLASS)}>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              disabled={trashDisabled}
              aria-label={t("docs.trash.moveNamed", { title: document.title })}
              title={t("docs.trash.move")}
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={onTrash}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
