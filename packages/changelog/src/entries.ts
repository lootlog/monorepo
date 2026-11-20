/// <reference types="vite/client" />
import type { ChangelogEntry, ChangelogItem } from "./changelog.js";

/**
 * Every entry, bundled into the client that imports it, so a client shows
 * exactly the changes of the commit it was built from. One file per entry
 * keeps parallel pull requests from conflicting; the file name is the id.
 * Vite resolves the glob, so only Vite-built clients import this module.
 */
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
