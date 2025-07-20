import { GuildMember } from "@/hooks/api/use-guild-member";
import { Permission } from "@/hooks/api/use-guild-permissions";

import { useTranslation } from "react-i18next";

export type MemberDataProps = {
  member: GuildMember;
};

export const MemberData = ({ member }: MemberDataProps) => {
  const { t } = useTranslation();

  return (
    <div>
      {member.roles.length === 0 && (
        <div className="text-gray-500 p-4">
          Brak przypisanych ról - może być potrzebna synchronizacja
        </div>
      )}
      {member.roles.map((role) => {
        const color = role.color === 0 ? "FFF" : role.color.toString(16);

        return (
          <span
            key={role.id}
            className="border-b p-4 text-sm font-semibold flex flex-col"
            style={{ color: `#${color}` }}
          >
            <span>
              <span>{role.name} </span>
              <span>
                <span className="text-xs text-gray-500">
                  ({role.lvlRangeFrom} - {role.lvlRangeTo})
                </span>
              </span>
            </span>
            <span className="flex gap-1 flex-wrap">
              {role.permissions.length > 0 &&
                role.permissions.map((permission) => {
                  if (permission === Permission.OWNER) return null;

                  return (
                    <span key={permission} className="text-xs text-gray-400">
                      {t(`permissions.${permission}`)}
                      {role.permissions.length > 1 &&
                        permission !==
                          role.permissions[role.permissions.length - 1] &&
                        ", "}
                    </span>
                  );
                })}
            </span>
          </span>
        );
      })}
    </div>
  );
};
