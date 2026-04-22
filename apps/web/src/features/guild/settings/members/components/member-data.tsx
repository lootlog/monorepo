import type { MemberResponseDto as GuildMember } from "@/lib/api/generated/main/model";
import { Permission } from "@lootlog/types";
import { useTranslation } from "react-i18next";
import { Card } from "@lootlog/ui/components/card";
import { cn } from "@lootlog/ui/lib/utils";
import { PERMISSION_CATEGORIES } from "@/features/guild/settings/roles/constants/permission-categories";
import { Badge } from "@lootlog/ui/components/badge";
import { MemberLootlogConfigCard } from "@/features/guild/settings/members/components/member-lootlog-config-card";
import { MemberSyncButton } from "@/features/guild/settings/members/components/member-sync-button";
import { MemberDeactivationButton } from "@/features/guild/settings/members/components/member-deactivation-button";
import { useSelectorPanel } from "@/components/selector-panel";

export type MemberDataProps = {
  member: GuildMember;
  canManageMembers: boolean;
};
const getPermissionStyle = (permission: Permission) => {
  const category = PERMISSION_CATEGORIES.find((cat) =>
    cat.permissions.includes(permission),
  );
  return category
    ? { icon: category.icon, color: category.color, bgColor: category.bgColor }
    : null;
};

export const MemberData = ({ member, canManageMembers }: MemberDataProps) => {
  const { t } = useTranslation();
  const { setSelectedItem } = useSelectorPanel<GuildMember>();

  return (
    <div className="p-3 space-y-3">
      <Card className="bg-card/50 backdrop-blur-sm border-border p-4 gap-3">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">
            {t("settings.members.actionsTitle")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {member.active
              ? t("settings.members.statusActiveDescription")
              : t("settings.members.statusInactiveDescription")}
          </p>
        </div>
        <div>
          <Badge variant={member.active ? "green" : "outline"}>
            {member.active
              ? t("settings.members.statusActive")
              : t("settings.members.statusInactive")}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MemberSyncButton member={member} />
          {canManageMembers && (
            <MemberDeactivationButton
              member={member}
              onDeactivated={(updatedMember) => setSelectedItem(updatedMember)}
            />
          )}
        </div>
        {!member.active && (
          <p className="text-xs text-muted-foreground">
            {t("settings.members.reactivateHint")}
          </p>
        )}
      </Card>

      <MemberLootlogConfigCard
        member={member}
        canManageMembers={canManageMembers}
      />

      <Card className="bg-card/50 backdrop-blur-sm border-border p-4 gap-1">
        <h3 className="text-sm font-semibold">
          {t("settings.members.rolesTitle")}
        </h3>
        {member.roles.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {t("settings.members.noRoles")}
          </p>
        )}
      </Card>

      {member.roles.map((role) => {
        const roleColor = role.color ?? 0;
        const color =
          roleColor === 0 ? "FFF" : roleColor.toString(16).padStart(6, "0");
        const filteredPermissions = role.permissions.filter(
          (permission) => permission !== "OWNER",
        ) as Permission[];

        return (
          <Card
            key={role.id}
            className="bg-card/50 backdrop-blur-sm border-border overflow-hidden p-0 gap-0"
          >
            <div className="p-3">
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `#${color}20` }}
                >
                  <div
                    className="size-4 rounded-full"
                    style={{ backgroundColor: `#${color}` }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-semibold text-sm truncate"
                      style={{ color: `#${color}` }}
                    >
                      {role.name}
                    </span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {role.lvlRangeFrom} - {role.lvlRangeTo}
                    </span>
                  </div>
                  {filteredPermissions.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t("settings.members.permissionsCount", {
                        count: filteredPermissions.length,
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {filteredPermissions.length > 0 && (
              <div className="border-t border-border/50 divide-y divide-border/50">
                {filteredPermissions.map((permission) => {
                  const style = getPermissionStyle(permission);
                  const IconComponent = style?.icon;

                  return (
                    <div
                      key={permission}
                      className={cn(
                        "flex items-center gap-3 py-2.5 px-4 pl-6",
                        "transition-colors hover:bg-muted/20",
                      )}
                    >
                      {IconComponent ? (
                        <div className={cn("p-1 rounded", style?.bgColor)}>
                          <IconComponent
                            className={cn("size-3", style?.color)}
                          />
                        </div>
                      ) : (
                        <div className="size-5" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {t(`permissions.${permission}`)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};
