import type { GuildMember } from "@/hooks/api/members/use-guild-member";
import { Permission } from "@lootlog/types";
import { useTranslation } from "react-i18next";
import { Card } from "@lootlog/ui/components/card";
import { cn } from "@lootlog/ui/lib/utils";
import { PERMISSION_CATEGORIES } from "@/features/guild/settings/roles/constants/permission-categories";
import { formatDiscordColor } from "@/utils/format-discord-color";

export type MemberDataProps = {
  member: GuildMember;
};
const getPermissionStyle = (permission: Permission) => {
  const category = PERMISSION_CATEGORIES.find((cat) =>
    cat.permissions.includes(permission),
  );
  return category
    ? { icon: category.icon, color: category.color, bgColor: category.bgColor }
    : null;
};

export const MemberData = ({ member }: MemberDataProps) => {
  const { t } = useTranslation();

  if (member.roles.length === 0) {
    return (
      <div className="p-3">
        <Card className="bg-card/50 backdrop-blur-sm border-border p-4">
          <p className="text-muted-foreground text-sm">
            Brak przypisanych ról - może być potrzebna synchronizacja
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      {member.roles.map((role) => {
        const color = formatDiscordColor(role.color);
        const filteredPermissions = role.permissions.filter(
          (p) => p !== Permission.OWNER,
        );

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
                      {filteredPermissions.length} uprawnień
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
