import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent } from "@lootlog/ui/components/dialog";
import { Label } from "@lootlog/ui/components/label";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Search, X, Users, UserPlus, AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { cn } from "cn";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useMembersControllerGetGuildMembers } from "@lootlog/client/main";
import { SearchInput } from "@/components/ui/search-input";
import { useAssignmentCountdown } from "../../hooks/utils/use-assignment-countdown";
import { IconDialogHeader } from "@/components/common/icon-dialog-header";
import { LoadingSlot } from "@/components/common/loading-slot";

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

  const { data: members, isLoading } = useMembersControllerGetGuildMembers({
    guildId: guildId ?? "",
  });

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
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
                      className="group inline-flex items-center gap-2 pl-1 pr-1.5 py-1 bg-signal-ready/10 hover:bg-signal-ready/15 rounded-full border border-signal-ready/20 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center overflow-hidden ring-2 ring-signal-ready/20">
                        {/* eslint-disable-next-line eslint-plugin-next/no-img-element */}
                        <img
                          src={getDiscordAvatarUrl(
                            member.userId,
                            member.avatar,
                            32,
                          )}
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-xs font-medium">{member.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        loading={
                          pendingAction?.kind === "unassign" &&
                          pendingAction.memberId === member.id
                        }
                        disabled={Boolean(pendingAction)}
                        icon=<X className="size-3" />
                        aria-label={t("events.maps.unassign")}
                        onClick={() => handleUnassign(member.id)}
                        className="size-5 p-0.5 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                        title={t("events.maps.unassign")}
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
              <Label
                htmlFor={memberSearchInputId}
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                {t("events.maps.addMember")}
              </Label>
              <SearchInput
                id={memberSearchInputId}
                placeholder={t("events.maps.searchMember")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 text-sm"
              />

              <ScrollArea className="h-[220px] rounded-lg border relative">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full py-8">
                    <LoadingSlot size="small" className="mb-2" />
                    <p className="text-xs text-muted-foreground">
                      {t("common.loading")}
                    </p>
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

                      return (
                        <Button
                          variant="ghost"
                          loading={
                            pendingAction?.kind === "assign" &&
                            pendingAction.memberId === member.id
                          }
                          key={member.id}
                          onClick={() =>
                            !isAssigned &&
                            !isAssignDisabled &&
                            handleAssign(member.id)
                          }
                          disabled={
                            isAssigned ||
                            isAssignDisabled ||
                            Boolean(pendingAction)
                          }
                          className={cn(
                            "h-auto w-full justify-start rounded-none flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                            isAssigned || isAssignDisabled
                              ? "opacity-50 cursor-default bg-muted/30"
                              : "hover:bg-muted/50 cursor-pointer",
                          )}
                        >
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden ring-2 ring-border">
                            {/* eslint-disable-next-line eslint-plugin-next/no-img-element */}
                            <img
                              src={getDiscordAvatarUrl(
                                member.userId,
                                member.avatar,
                                32,
                              )}
                              alt={member.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="flex-1 text-sm font-medium">
                            {member.name}
                          </span>
                          {isAssigned ? (
                            <span className="text-[10px] font-medium text-signal-ready bg-signal-ready/10 px-2 py-0.5 rounded-full">
                              {t("events.maps.alreadyAssigned")}
                            </span>
                          ) : (
                            <UserPlus className="size-4 text-muted-foreground" />
                          )}
                        </Button>
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
            size="sm"
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
