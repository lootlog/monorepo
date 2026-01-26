import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { Input } from "@lootlog/ui/components/input";
import { Label } from "@lootlog/ui/components/label";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Search, X, Users, UserPlus, Loader2 } from "lucide-react";
import { useGuildMembers } from "@/hooks/api/members/use-guild-members";
import { cn } from "@lootlog/ui/lib/utils";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";

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
  onAssign: (memberId: number) => void;
  onUnassign: (memberId: number) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export const MemberAssignmentModal = ({
  open,
  onOpenChange,
  mapName,
  assignedMembers,
  onAssign,
  onUnassign,
  isLoading: isActionLoading,
  disabled,
}: MemberAssignmentModalProps) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const { data: members, isLoading } = useGuildMembers();

  const filteredMembers = members?.filter((member) =>
    member.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAssign = (memberId: number) => {
    onAssign(memberId);
  };

  const handleUnassign = (memberId: number) => {
    onUnassign(memberId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-4 border-b bg-muted/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Users className="size-4 text-green-500" />
            </div>
            <div>
              <DialogTitle className="text-base">
                {t("events.maps.assign")}
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {mapName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
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
                      className="group inline-flex items-center gap-2 pl-1 pr-1.5 py-1 bg-green-500/10 hover:bg-green-500/15 rounded-full border border-green-500/20 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center overflow-hidden ring-2 ring-green-500/20">
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
                      <button
                        onClick={() => handleUnassign(member.id)}
                        className="p-0.5 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                        title={t("events.maps.unassign")}
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 px-4 rounded-lg border border-dashed text-center">
                  <Users className="size-6 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">
                    {t("events.maps.noAssignedMembers")}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("events.maps.addMember")}
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder={t("events.maps.searchMember")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              <ScrollArea className="h-[220px] rounded-lg border relative">
                {isActionLoading && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                    <Loader2 className="size-5 animate-spin text-primary" />
                  </div>
                )}
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full py-8">
                    <Loader2 className="size-6 animate-spin text-primary mb-2" />
                    <p className="text-xs text-muted-foreground">
                      {t("common.loading")}
                    </p>
                  </div>
                ) : filteredMembers?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
                    <Search className="size-8 mb-2 opacity-30" />
                    <p className="text-xs">
                      {t("events.maps.noMembersFound")}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredMembers?.map((member) => {
                      const isAssigned = assignedMembers.some(
                        (m) => m.id === member.id,
                      );

                      return (
                        <button
                          key={member.id}
                          onClick={() => !isAssigned && !disabled && handleAssign(member.id)}
                          disabled={isAssigned || disabled}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                            isAssigned || disabled
                              ? "opacity-50 cursor-default bg-muted/30"
                              : "hover:bg-muted/50 cursor-pointer",
                          )}
                        >
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden ring-2 ring-border">
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
                          <span className="flex-1 text-sm font-medium">{member.name}</span>
                          {isAssigned ? (
                            <span className="text-[10px] font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
                              {t("events.maps.alreadyAssigned")}
                            </span>
                          ) : (
                            <UserPlus className="size-4 text-muted-foreground" />
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
            size="sm"
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
