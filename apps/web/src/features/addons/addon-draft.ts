import type {
  AddonLanguage,
  CreateUserAddonPayload,
  UserAddon,
} from "@/features/addons/types";

export type AddonDraft = {
  runtimeId: string;
  name: string;
  description: string;
  version: string;
  language: AddonLanguage;
  sourceCode: string;
  installed: boolean;
};

export const TS_TEMPLATE = `import { defineAddon } from "@lootlog/addon-sdk";

export default defineAddon({
  id: "my-addon",
  name: "My Addon",
  version: "0.1.0",
  setup({ Game, log }) {
    log("Addon enabled on world:", Game.getWorldName());

    return () => {
      log("Addon disabled");
    };
  },
});
`;

export const JS_TEMPLATE = `const { defineAddon } = require("@lootlog/addon-sdk");

module.exports.default = defineAddon({
  id: "my-addon",
  name: "My Addon",
  version: "0.1.0",
  setup({ Game, log }) {
    log("Addon enabled on world:", Game.getWorldName());

    return () => {
      log("Addon disabled");
    };
  },
});
`;

export const createDraft = (
  language: AddonLanguage = "TYPESCRIPT",
): AddonDraft => ({
  runtimeId: "my-addon",
  name: "My Addon",
  description: "",
  version: "0.1.0",
  language,
  sourceCode: language === "TYPESCRIPT" ? TS_TEMPLATE : JS_TEMPLATE,
  installed: false,
});

export const fromAddon = (addon: UserAddon): AddonDraft => ({
  runtimeId: addon.runtimeId,
  name: addon.name,
  description: addon.description ?? "",
  version: addon.version,
  language: addon.language,
  sourceCode: addon.sourceCode,
  installed: addon.installed,
});

export const draftToPayload = (draft: AddonDraft): CreateUserAddonPayload => ({
  language: draft.language,
  sourceCode: draft.sourceCode,
  installed: draft.installed,
});
