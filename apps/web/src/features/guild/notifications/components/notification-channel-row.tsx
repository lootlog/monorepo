import {
  getListTileLinkClassName,
  LIST_TILE_ACTIONS_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import type {
  GuildNotificationRulesResponseDto,
  NotificationTargetResponseDto,
} from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import { cn } from "cn";
import {
  Hash,
  MoreHorizontal,
  Pencil,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getGuildNotificationOrphanedRuleCount,
  getGuildNotificationTargetLabel,
  getNotificationTriggerTranslationKey,
} from "../utils/notification-settings.utils";
import { NotificationConfirmDialog } from "./notification-confirm-dialog";
import { useDeleteNotificationTarget } from "./use-delete-notification-target";

type NotificationChannelRowProps = {
  target: NotificationTargetResponseDto;
  /** Every rule, to name the ones that send here. */
  rules: GuildNotificationRulesResponseDto["items"];
  actionsDisabled: boolean;
  onEdit: (target: NotificationTargetResponseDto) => void;
};

/** One Discord channel: which rules send to it, and why it cannot deliver if so. */
export const NotificationChannelRow = ({
  target,
  rules,
  actionsDisabled,
  onEdit,
}: NotificationChannelRowProps) => {
  const { t } = useTranslation();
  const { handleDelete, isDeleting } = useDeleteNotificationTarget(target);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const isActionDisabled = actionsDisabled || isDeleting;
  const label = getGuildNotificationTargetLabel(target);

  const orphanedRuleCount = getGuildNotificationOrphanedRuleCount(
    target.id,
    rules,
  );

  const ruleNames = rules
    .filter((rule) =>
      rule.targets.some(({ target: { id } }) => id === target.id),
    )
    .map(
      (rule) =>
        rule.name ?? t(getNotificationTriggerTranslationKey(rule.triggerType)),
    );

  let problem: string | undefined;

  if (!target.active) problem = t("settings.notifications.states.inactive");
  else if (!target.canSend)
    problem = t("settings.notifications.states.cannotSend");

  return (
    <div data-list-tile className={LIST_TILE_RULE_CLASS}>
      <div
        className={cn(
          "flex items-center transition-colors hover:bg-muted/30 motion-reduce:transition-none",
          problem && "bg-signal-timer/[0.06] hover:bg-signal-timer/10",
        )}
      >
        <button
          type="button"
          disabled={isActionDisabled}
          onClick={() => onEdit(target)}
          className={cn(
            getListTileLinkClassName(true),
            "text-left disabled:cursor-not-allowed",
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Hash aria-hidden className="size-4 text-muted-foreground" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 truncate text-sm font-semibold">
                {label}
              </span>
              {problem && (
                <span className="flex shrink-0 items-center gap-1 text-xs text-signal-timer">
                  <TriangleAlert aria-hidden className="size-3.5" />
                  {problem}
                </span>
              )}
            </span>
            <span className="text-[13px] leading-5 text-text-supporting">
              {ruleNames.length > 0
                ? t("settings.notifications.rows.usedBy", {
                    rules: ruleNames.join(", "),
                  })
                : t("settings.notifications.rows.unused")}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {t(`settings.notifications.targetTypes.${target.targetType}`)}
              {" · "}
              {target.externalId}
            </span>
          </span>
        </button>
        <div className={LIST_TILE_ACTIONS_CLASS}>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  aria-label={t("settings.notifications.actions.moreNamed", {
                    name: label,
                  })}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                disabled={isActionDisabled}
                onClick={() => onEdit(target)}
              >
                <Pencil />
                {t("settings.notifications.actions.editChannel")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={isActionDisabled}
                onClick={() => setIsConfirmingDelete(true)}
              >
                <Trash2 />
                {t("settings.notifications.actions.deleteChannel")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <NotificationConfirmDialog
        open={isConfirmingDelete}
        onOpenChange={setIsConfirmingDelete}
        title={t("settings.notifications.deleteTargetDialog.title")}
        description={
          orphanedRuleCount > 0
            ? t(
                "settings.notifications.deleteTargetDialog.descriptionWithOrphanedRules",
                { name: label, count: orphanedRuleCount },
              )
            : t("settings.notifications.deleteTargetDialog.description", {
                name: label,
              })
        }
        confirmLabel={t("settings.notifications.actions.delete")}
        onConfirm={handleDelete}
      />
    </div>
  );
};
