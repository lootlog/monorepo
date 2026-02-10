export type AddonLanguage = "JAVASCRIPT" | "TYPESCRIPT";

export type UserAddon = {
  id: string;
  runtimeId: string;
  name: string;
  description?: string | null;
  version: string;
  language: AddonLanguage;
  sourceCode: string;
  installed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AddonTypeBundle = {
  files: { path: string; content: string }[];
  sdkDeclaration: string;
  compilerHints: {
    baseUrl: string;
    paths: Record<string, string[]>;
  };
};

export type CreateUserAddonPayload = {
  language?: AddonLanguage;
  sourceCode: string;
  installed?: boolean;
};

export type UpdateUserAddonPayload = Partial<CreateUserAddonPayload> & {
  installed?: boolean;
};
