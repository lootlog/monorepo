/// <reference types="vite/client" />
import type { ChangelogEntry, ChangelogItem } from "./changelog.js";

const modules = import.meta.glob<ChangelogEntry>("./entries/*.ts", {
  eager: true,
  import: "default",
});

export const CHANGELOG: ChangelogItem[] = Object.entries(modules).map(
  ([path, entry]) => ({
    ...entry,
    id: path.slice("./entries/".length, -".ts".length),
  }),
);
