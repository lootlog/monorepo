import type { MemberReferenceResponseDtoOutputRolesItem as MemberRole } from "@lootlog/client/main";
import { discordRoleCssColor } from "@lootlog/domain/member-display-role";
import { useTranslation } from "react-i18next";

export const MemberProfileRoles = ({ roles }: { roles: MemberRole[] }) => {
  const { t } = useTranslation();

  if (roles.length === 0) return null;

  return (
    <ul
      aria-label={t("common.memberProfile.roles")}
      className="mt-3 flex flex-wrap gap-1"
    >
      {roles.map((role) => (
        <li
          key={role.id}
          className="inline-flex items-center gap-1.5 rounded-md border bg-muted/40 px-1.5 py-0.5 text-xs"
        >
          <span
            aria-hidden
            className="size-2 rounded-full bg-muted-foreground"
            style={{
              backgroundColor: discordRoleCssColor(role.color) ?? undefined,
            }}
          />
          {role.name}
        </li>
      ))}
    </ul>
  );
};
