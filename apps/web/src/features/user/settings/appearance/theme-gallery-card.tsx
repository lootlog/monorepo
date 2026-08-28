import type { ThemeConfigV1 } from "@lootlog/types";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import {
  Check,
  Copy,
  Download,
  LockKeyhole,
  MoreHorizontal,
  Pencil,
  Settings2,
  Shuffle,
  Trash2,
} from "lucide-react";

interface ThemeGalleryCardProps {
  title: string;
  description: string;
  config: ThemeConfigV1;
  backgroundImage?: string;
  isActive: boolean;
  kind: "preset" | "custom" | "special";
  availability?: "available" | "locked";
  onActivate: () => void;
  onEdit?: () => void;
  onRemix?: () => void;
  onDuplicate?: () => void;
  onDownload?: () => void;
  onCopyCode?: () => void;
  onDelete?: () => void;
  onConfigure?: () => void;
  labels: {
    active: string;
    activate: string;
    preset: string;
    custom: string;
    special: string;
    edit: string;
    remix: string;
    duplicate: string;
    download: string;
    copyCode: string;
    delete: string;
    configure: string;
    locked: string;
    more: string;
  };
}

export const ThemeGalleryCard = ({
  title,
  description,
  config,
  backgroundImage,
  isActive,
  kind,
  availability = "available",
  onActivate,
  onEdit,
  onRemix,
  onDuplicate,
  onDownload,
  onCopyCode,
  onDelete,
  onConfigure,
  labels,
}: ThemeGalleryCardProps) => {
  const hasMoreActions = Boolean(
    onDuplicate || onCopyCode || onDownload || onDelete,
  );

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-card transition-[border-color,transform] hover:-translate-y-0.5 hover:border-input-focus">
      <div
        className="relative h-28 overflow-hidden border-b border-border"
        style={{
          backgroundColor: config.tokens.background,
          ...(backgroundImage
            ? {
                backgroundImage: `linear-gradient(to bottom, transparent, ${config.tokens.background}), url("${backgroundImage}")`,
                backgroundPosition: "center",
                backgroundSize: "cover",
              }
            : {}),
        }}
      >
        <div className="absolute inset-x-3 bottom-3 flex items-end gap-2">
          <div
            className="h-12 flex-1 rounded-lg border p-2"
            style={{
              backgroundColor: config.tokens.card,
              borderColor: config.tokens.border,
              borderRadius: "var(--radius)",
            }}
          >
            <div
              className="mb-2 h-1.5 w-2/3 rounded-full"
              style={{ backgroundColor: config.tokens.foreground }}
            />
            <div
              className="h-1.5 w-1/2 rounded-full"
              style={{ backgroundColor: config.tokens.mutedForeground }}
            />
          </div>
          {config.charts.slice(0, 3).map((color, index) => (
            <span
              key={color}
              className="w-2 rounded-full"
              style={{ backgroundColor: color, height: `${18 + index * 9}px` }}
            />
          ))}
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{title}</h3>
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
          <Badge variant={kind === "special" ? "default" : "secondary"}>
            {availability === "locked" ? (
              <LockKeyhole className="size-3" />
            ) : null}
            {availability === "locked" ? labels.locked : labels[kind]}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={
              isActive
                ? "secondary"
                : kind === "special"
                  ? "outline"
                  : "default"
            }
            className="min-h-11 min-w-0 flex-1 sm:min-h-9"
            disabled={isActive || availability === "locked"}
            onClick={onActivate}
          >
            {isActive ? <Check /> : null}
            {isActive ? labels.active : labels.activate}
          </Button>
          {onEdit ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-11 sm:size-10"
              onClick={onEdit}
              aria-label={labels.edit}
            >
              <Pencil />
            </Button>
          ) : null}
          {onRemix ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-11 sm:size-10"
              onClick={onRemix}
              aria-label={labels.remix}
            >
              <Shuffle />
            </Button>
          ) : null}
          {onConfigure && availability === "available" ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-11 sm:size-10"
              onClick={onConfigure}
              aria-label={labels.configure}
            >
              <Settings2 />
            </Button>
          ) : null}
          {hasMoreActions ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-11 sm:size-10"
                    aria-label={labels.more}
                  >
                    <MoreHorizontal />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-48">
                {onDuplicate ? (
                  <DropdownMenuItem onClick={onDuplicate}>
                    <Copy />
                    {labels.duplicate}
                  </DropdownMenuItem>
                ) : null}
                {onCopyCode ? (
                  <DropdownMenuItem onClick={onCopyCode}>
                    <Copy />
                    {labels.copyCode}
                  </DropdownMenuItem>
                ) : null}
                {onDownload ? (
                  <DropdownMenuItem onClick={onDownload}>
                    <Download />
                    {labels.download}
                  </DropdownMenuItem>
                ) : null}
                {onDelete ? <DropdownMenuSeparator /> : null}
                {onDelete ? (
                  <DropdownMenuItem variant="destructive" onClick={onDelete}>
                    <Trash2 />
                    {labels.delete}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </article>
  );
};
