import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  userAc,
} from "better-auth/plugins/admin/access";

export const authStatements = {
  ...defaultStatements,
  addon: ["list", "review", "approve", "reject", "hide"],
} as const;

const ac = createAccessControl(authStatements);

const admin = ac.newRole({
  ...adminAc.statements,
  addon: ["list", "review", "approve", "reject", "hide"],
});

const user = ac.newRole({
  ...userAc.statements,
});

const moderator = ac.newRole({
  ...userAc.statements,
  addon: ["list", "review"],
});

const developer = ac.newRole({
  ...userAc.statements,
  addon: ["list"],
});

export const authAccessControl = {
  ac,
  roles: {
    admin,
    user,
    moderator,
    developer,
  },
} as const;
