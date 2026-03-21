// @ts-nocheck
import { browser } from "fumadocs-mdx/runtime/browser";
import type * as Config from "../source.config";

const create = browser<
  typeof Config,
  import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
    DocData: {};
  }
>();
const browserCollections = {
  docs: create.doc("docs", {
    "events.mdx": () => import("../content/docs/events.mdx?collection=docs"),
    "faq.mdx": () => import("../content/docs/faq.mdx?collection=docs"),
    "features.mdx": () =>
      import("../content/docs/features.mdx?collection=docs"),
    "getting-started.mdx": () =>
      import("../content/docs/getting-started.mdx?collection=docs"),
    "index.mdx": () => import("../content/docs/index.mdx?collection=docs"),
    "installation.mdx": () =>
      import("../content/docs/installation.mdx?collection=docs"),
  }),
};
export default browserCollections;
