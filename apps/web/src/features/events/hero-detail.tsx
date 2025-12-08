import { useTranslation } from "react-i18next";
import { useParams, Link } from "@tanstack/react-router";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { useEvent } from "./hooks/use-event";
import { EventMapGrid } from "./components/event-map-grid";
import { Swords, MapPin, Users, AlertCircle, Plus, Eraser } from "lucide-react";
import { useGuildPermissions } from "@/hooks/api/guilds/use-guild-permissions";
import { Permission } from "@lootlog/types";
import { useState } from "react";
import { MapManageDialog } from "./components/map-manage-dialog";
import { MemberAssignmentModal } from "./components/member-assignment-modal";
import { useAssignMember, useUnassignMember } from "./hooks/use-assign-member";
import { toast } from "sonner";
import { useGuildMember } from "@/hooks/api/members/use-guild-member";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";

const MemberBadge = ({ member }: { member: any }) => {
  const color = useMemberColor(member);
  const avatarUrl = getDiscordAvatarUrl(member.userId, member.avatar, 32);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-transparent hover:border-border transition-colors">
      <img src={avatarUrl} alt={member.name} className="w-5 h-5 rounded-full" />
      <span className="text-sm font-medium" style={{ color }}>
        {member.name}
      </span>
    </div>
  );
};

export const HeroDetail = () => {
  const { t } = useTranslation();
  const { guildId, eventId, heroId } = useParams({ strict: false });
  const [mapManageOpen, setMapManageOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);

  const { data: permissions } = useGuildPermissions();
  const { data: currentMember } = useGuildMember();
  const assignMember = useAssignMember();
  const unassignMember = useUnassignMember();

  const canManage =
    permissions?.includes(Permission.LOOTLOG_MANAGE) ||
    permissions?.includes(Permission.ADMIN) ||
    permissions?.includes(Permission.OWNER);

  const {
    data: event,
    isLoading,
    error,
  } = useEvent({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const hero = event?.heroNpcs?.find((h) => h.id === heroId);

  if (error || !event || !hero) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">
          {t("events.heroes.notFound", "Nie znaleziono herosa")}
        </p>
        <Link
          to="/$guildId/events/$eventId"
          params={{ guildId: guildId ?? "", eventId: eventId ?? "" }}
        >
          <Button variant="outline">
            {t("events.common.backToEvent", "Powrót do eventu")}
          </Button>
        </Link>
      </div>
    );
  }

  const allAssignedMembers = hero.maps?.flatMap((m) => m.assignedMembers) || [];
  const uniqueMembers = Array.from(
    new Map(allAssignedMembers.map((m) => [m.id, m])).values(),
  );

  const handleAssignClick = async (mapId: string) => {
    if (canManage) {
      setSelectedMapId(mapId);
      setAssignmentOpen(true);
    } else if (currentMember) {
      // Self assign for regular members
      try {
        await assignMember.mutateAsync({
          eventId: eventId!,
          mapId,
          memberId: currentMember.id,
        });
        toast.success(t("events.maps.assignSuccess", "Przypisano do mapy"));
      } catch (error) {
        toast.error(t("events.maps.assignError", "Błąd podczas przypisywania"));
      }
    }
  };

  const handleUnassignClick = async (mapId: string) => {
    try {
      // If user is not admin, they can only unassign themselves
      const memberIdToUnassign = !canManage ? currentMember?.id : undefined;

      await unassignMember.mutateAsync({
        eventId: eventId!,
        mapId,
        memberId: memberIdToUnassign,
      });
      toast.success(t("events.maps.unassignSuccess", "Odpisano z mapy"));
    } catch (error) {
      toast.error(t("events.maps.unassignError", "Błąd podczas odpisywania"));
    }
  };

  const handleAssignFromModal = async (memberId: number) => {
    if (!selectedMapId || !guildId || !eventId) return;

    try {
      await assignMember.mutateAsync({
        eventId,
        mapId: selectedMapId,
        memberId,
      });
      toast.success(t("events.maps.assignSuccess", "Przypisano członka"));
    } catch (error) {
      toast.error(t("events.maps.assignError", "Błąd podczas przypisywania"));
    }
  };

  const handleUnassignFromModal = async (memberId: number) => {
    if (!selectedMapId || !guildId || !eventId) return;

    try {
      await unassignMember.mutateAsync({
        eventId,
        mapId: selectedMapId,
        memberId,
      });
      toast.success(t("events.maps.unassignSuccess", "Odpisano członka"));
    } catch (error) {
      toast.error(t("events.maps.unassignError", "Błąd podczas odpisywania"));
    }
  };

  const selectedMap = hero.maps?.find((m) => m.id === selectedMapId);

  const handleClearAllAssignments = async () => {
    if (!hero.maps || hero.maps.length === 0) return;

    try {
      // Clear assignments from all maps
      await Promise.all(
        hero.maps.map((map) =>
          unassignMember.mutateAsync({
            eventId: eventId!,
            mapId: map.id,
            // Not passing memberId clears all assignments
          }),
        ),
      );
      toast.success(
        t("events.maps.clearAllSuccess", "Wyczyszczono wszystkie przypisania"),
      );
    } catch (error) {
      toast.error(
        t("events.maps.clearAllError", "Błąd podczas czyszczenia przypisań"),
      );
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="bg-background w-full flex items-center border-b px-3 shrink-0 py-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-2 rounded-lg bg-yellow-500/10">
            <Swords className="size-4 text-yellow-500" />
          </div>
          <div>
            <h2 className="text-sm font-semibold leading-tight">
              {hero.npcName}
            </h2>
            <p className="text-xs text-muted-foreground leading-tight">
              ID: {hero.npcId} • {event.name}
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 flex flex-col gap-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4 bg-card/40 backdrop-blur-sm border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{hero.maps?.length || 0}</p>
                <p className="text-sm text-muted-foreground">
                  {t("events.maps.title")}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card/40 backdrop-blur-sm border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Users className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{uniqueMembers.length}</p>
                <p className="text-sm text-muted-foreground">
                  {t("events.participants.count", "Uczestników")}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Participants */}
        {uniqueMembers.length > 0 && (
          <Card className="p-4 bg-card/40 backdrop-blur-sm border-border">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t("events.participants.title", "Uczestnicy")}
            </h2>
            <div className="flex flex-wrap gap-2">
              {uniqueMembers.map((member) => (
                <MemberBadge key={member.id} member={member} />
              ))}
            </div>
          </Card>
        )}

        {/* Maps */}
        <Card className="p-4 bg-card/40 backdrop-blur-sm border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              {t("events.maps.title")}
            </h2>
            {canManage && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAllAssignments}
                  disabled={uniqueMembers.length === 0}
                >
                  <Eraser className="w-4 h-4 mr-2" />
                  {t("events.maps.clearAll", "Wyczyść przypisania")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMapManageOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t("events.maps.manage", "Zarządzaj mapami")}
                </Button>
              </div>
            )}
          </div>
          <EventMapGrid
            maps={hero.maps || []}
            guildId={guildId ?? ""}
            eventId={eventId ?? ""}
            heroId={hero.id}
            onAssignClick={handleAssignClick}
            onUnassignClick={handleUnassignClick}
            currentMemberId={currentMember?.id}
          />
        </Card>
      </div>

      {/* Dialogs */}
      <MapManageDialog
        open={mapManageOpen}
        onOpenChange={setMapManageOpen}
        guildId={guildId ?? ""}
        eventId={eventId ?? ""}
        hero={hero}
      />

      {selectedMap && (
        <MemberAssignmentModal
          open={assignmentOpen}
          onOpenChange={setAssignmentOpen}
          mapName={selectedMap.mapName}
          assignedMembers={selectedMap.assignedMembers || []}
          onAssign={handleAssignFromModal}
          onUnassign={handleUnassignFromModal}
        />
      )}
    </div>
  );
};
