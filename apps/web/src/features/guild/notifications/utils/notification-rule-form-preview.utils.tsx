import { defaultUrlTransform, type Components } from "react-markdown";
import type { RoleResponseDtoOutput as GuildRole } from "@lootlog/api-client/models/main/role-response-dto-output";
import { getCustomRoleCssColor } from "@/utils/get-color-from-role";

const ROLE_LINK_PREFIX = "role:";

export const replaceRoleMentions = (text: string, roles: GuildRole[]) => {
  const roleById = new Map(roles.map((role) => [role.id, role] as const));

  return text
    .replace(/<@&(\d+)>/g, (_match, roleId: string) => {
      const role = roleById.get(roleId);
      const name = role ? `@${role.name}` : `@${roleId}`;
      const color = role ? (getCustomRoleCssColor(role.color) ?? "") : "";
      return `[${name}](${ROLE_LINK_PREFIX}${color})`;
    })
    .replace(/@(everyone|here)/g, (_match, keyword: string) => {
      return `[@${keyword}](${ROLE_LINK_PREFIX})`;
    });
};

export const previewUrlTransform = (url: string) =>
  url.startsWith(ROLE_LINK_PREFIX) ? url : defaultUrlTransform(url);

export const previewMarkdownComponents: Components = {
  a: ({ href, children }) => {
    if (href?.startsWith(ROLE_LINK_PREFIX)) {
      const color = href.slice(ROLE_LINK_PREFIX.length) || null;
      return (
        <span
          style={{
            backgroundColor: color ? `${color}22` : "var(--surface-selected)",
            borderRadius: "2px",
            color: color ?? "var(--primary)",
          }}
        >
          {children}
        </span>
      );
    }
    return <a href={href}>{children}</a>;
  },
};
