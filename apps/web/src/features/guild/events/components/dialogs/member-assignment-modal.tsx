import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent } from "@lootlog/ui/components/dialog";
import { Label } from "@lootlog/ui/components/label";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  AlertTriangle,
  CircleAlert,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { cn } from "cn";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { Spinner } from "@lootlog/ui/components/spinner";
import { MemberAvatar } from "@/components/common/member-avatar";
import { RetryButton } from "@/components/common/retry-button";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useMembersControllerGetGuildMembers } from "@lootlog/client/main";
import { SearchInput } from "@/components/ui/search-input";
import { useAssignmentCountdown } from "../../hooks/utils/use-assignment-countdown";
import { IconDialogHeader } from "@/components/common/icon-dialog-header";

interface MemberAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapName: string;
  assignedMembers: {
    id: number;
    name: string;
    avatar?: string | null;
    userId: string;
  }[];
  onAssign: (memberId: number) => void | Promise<void>;
  onUnassign: (memberId: number) => void | Promise<void>;
  disabled?: boolean;
  enabledAt?: number | null;
  disabledMessage?: string | null;
}

export const MemberAssignmentModal = ({
  open,
  onOpenChange,
  mapName,
  assignedMembers,
  onAssign,
  onUnassign,
  disabled = false,
  enabledAt,
  disabledMessage,
}: MemberAssignmentModalProps) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const memberSearchInputId = useId();
  const { isEnabled } = useAssignmentCountdown(disabled, enabledAt);
  const isAssignDisabled = !isEnabled;

  const [pendingAction, setPendingAction] = useState<{
    kind: "assign" | "unassign";
    memberId: number;
  } | null>(null);

  const changeAssignment = async (
    kind: "assign" | "unassign",
    memberId: number,
  ) => {
    await (kind === "assign" ? onAssign(memberId) : onUnassign(memberId));
  };

  const runAction = async (kind: "assign" | "unassign", memberId: number) => {
    if (pendingAction) return;
    setPendingAction({ kind, memberId });
    await changeAssignment(kind, memberId).finally(() =>
      setPendingAction(null),
    );
  };

  const guildId = useGuildId();

  const membersQuery = useMembersControllerGetGuildMembers({
    guildId: guildId ?? "",
  });

  const members = membersQuery.data;

  const filteredMembers = members?.filter((member) =>
    member.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAssign = (memberId: number) => {
    void runAction("assign", memberId);
  };

  const handleUnassign = (memberId: number) => {
    void runAction("unassign", memberId);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pendingAction) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col">
        <IconDialogHeader
          icon={Users}
          title={t("events.maps.assign")}
          description={mapName}
        />

        <div className="flex-1 overflow-y-auto custom-scrollbar [scrollbar-gutter:stable]">
          <div className="p-5 space-y-5">
            <div className="space-y-2">
              <Label>
                {t("events.maps.assignedMembers")}
                {assignedMembers.length > 0 && (
                  <span className="ml-1.5 text-foreground">
                    ({assignedMembers.length})
                  </span>
                )}
              </Label>

              {assignedMembers.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {assignedMembers.map((member) => (
                    <div
                      key={member.id}
                      className="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border border-signal-ready/20 bg-signal-ready/10 py-0.5 pr-0.5 pl-1"
                    >
                      <MemberAvatar
                        userId={member.userId}
                        avatar={member.avatar}
                        name={member.name}
                        imageSize={32}
                        className="size-6"
                      />
                      <span className="min-w-0 truncate text-xs font-medium">
                        {member.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        loading={
                          pendingAction?.kind === "unassign" &&
                          pendingAction.memberId === member.id
                        }
                        disabled={Boolean(pendingAction)}
                        icon=<X className="size-3" />
                        aria-label={t("events.maps.unassign")}
                        title={t("events.maps.unassign")}
                        onClick={() => handleUnassign(member.id)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  compact
                  icon={Users}
                  title={t("events.maps.noAssignedMembers")}
                />
              )}
            </div>

            <div className="space-y-2">
              {isAssignDisabled && disabledMessage && (
                <div className="flex items-start gap-2 rounded-lg border border-signal-timer/20 bg-signal-timer/10 p-3">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-signal-timer" />
                  <p className="text-xs text-muted-foreground">
                    {disabledMessage}
                  </p>
                </div>
              )}
              <Label htmlFor={memberSearchInputId}>
                {t("events.maps.addMember")}
              </Label>
              <SearchInput
                id={memberSearchInputId}
                placeholder={t("events.maps.searchMember")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-sm"
              />

              <ScrollArea className="h-[220px] rounded-lg border relative">
                {membersQuery.isPending ? (
                  <div
                    className="divide-y"
                    role="status"
                    aria-label={t("common.loading")}
                  >
                    {Array.from({ length: 4 }, (_, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 px-3 py-2.5"
                      >
                        <Skeleton className="size-8 shrink-0 rounded-full" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : membersQuery.isError ? (
                  <div role="alert">
                    <EmptyState
                      compact
                      icon={CircleAlert}
                      title={t("events.maps.membersLoadError")}
                      action={
                        <RetryButton
                          size="sm"
                          onRetry={() => membersQuery.refetch()}
                          isRetrying={membersQuery.isFetching}
                        />
                      }
                    />
                  </div>
                ) : filteredMembers?.length === 0 ? (
                  <EmptyState
                    compact
                    icon={Search}
                    title={t("events.maps.noMembersFound")}
                  />
                ) : (
                  <div className="divide-y">
                    {filteredMembers?.map((member) => {
                      const isAssigned = assignedMembers.some(
                        (m) => m.id === member.id,
                      );

                      const isPending =
                        pendingAction?.kind === "assign" &&
                        pendingAction.memberId === member.id;

                      return (
                        <button
                          type="button"
                          key={member.id}
                          onClick={() => handleAssign(member.id)}
                          disabled={
                            isAssigned ||
                            isAssignDisabled ||
                            Boolean(pendingAction)
                          }
                          aria-busy={isPending || undefined}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset enabled:cursor-pointer enabled:hover:bg-muted/40 disabled:cursor-default motion-reduce:transition-none"
                        >
                          <MemberAvatar
                            userId={member.userId}
                            avatar={member.avatar}
                            name={member.name}
                            imageSize={64}
                          />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {member.name}
                          </span>
                          {isAssigned ? (
                            <span className="shrink-0 rounded-full bg-signal-ready/10 px-2 py-0.5 text-xs font-medium text-signal-ready">
                              {t("events.maps.alreadyAssigned")}
                            </span>
                          ) : isPending ? (
                            <Spinner className="size-4 text-muted-foreground" />
                          ) : (
                            <UserPlus
                              aria-hidden
                              className={cn(
                                "size-4 shrink-0 text-muted-foreground",
                                isAssignDisabled && "opacity-50",
                              )}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t bg-muted/30 shrink-0">
          <Button
            variant="outline"
            disabled={Boolean(pendingAction)}
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            {t("events.common.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
