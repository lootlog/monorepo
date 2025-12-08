import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@lootlog/ui/components/dialog";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { User, Search, X } from "lucide-react";
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
}

export const MemberAssignmentModal = ({
  open,
  onOpenChange,
  mapName,
  assignedMembers,
  onAssign,
  onUnassign,
}: MemberAssignmentModalProps) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const { data: members, isLoading } = useGuildMembers();

  const filteredMembers = members?.filter((member) =>
    member.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAssign = (memberId: number) => {
    onAssign(memberId);
    // keeping open to allow multiple assignments
  };

  const handleUnassign = (memberId: number) => {
    onUnassign(memberId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("events.maps.assign")}</DialogTitle>
          <DialogDescription>
            Zarządzaj przypisaniami do mapy: <strong>{mapName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Assignments */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Aktualnie przypisani ({assignedMembers.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {assignedMembers.length > 0 ? (
                assignedMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 p-1.5 pr-2.5 rounded-full bg-primary/5 border border-primary/20"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
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
                    <span className="text-sm font-medium">{member.name}</span>
                    <button
                      onClick={() => handleUnassign(member.id)}
                      className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                      title={t("events.maps.unassign")}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <span className="text-sm text-muted-foreground italic">
                  Brak przypisanych członków
                </span>
              )}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Dodaj członka
              </span>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Szukaj członka..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Members List */}
          <ScrollArea className="h-64">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : filteredMembers?.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                Nie znaleziono członków
              </div>
            ) : (
              <div className="space-y-1">
                {filteredMembers?.map((member) => {
                  const isAssigned = assignedMembers.some(
                    (m) => m.id === member.id,
                  );

                  return (
                    <button
                      key={member.id}
                      onClick={() => !isAssigned && handleAssign(member.id)}
                      disabled={isAssigned}
                      className={cn(
                        "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors",
                        isAssigned
                          ? "opacity-50 cursor-default"
                          : "hover:bg-muted/50",
                      )}
                    >
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center overflow-hidden">
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
                      <span className="font-medium">{member.name}</span>
                      {isAssigned && (
                        <span className="ml-auto text-xs text-muted-foreground">
                          Już przypisany
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
