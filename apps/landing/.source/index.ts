// @ts-nocheck -- skip type checking
import * as docs_4 from "../content/docs/installation.mdx?collection=docs";
import * as docs_3 from "../content/docs/index.mdx?collection=docs";
import * as docs_2 from "../content/docs/getting-started.mdx?collection=docs";
import * as docs_1 from "../content/docs/features.mdx?collection=docs";
import * as docs_0 from "../content/docs/faq.mdx?collection=docs";
import { _runtime } from "fumadocs-mdx/runtime/next";
import * as _source from "../source.config";
export const docs = _runtime.docs<typeof _source.docs>(
  [
    {
      info: { path: "faq.mdx", fullPath: "content\\docs\\faq.mdx" },
      data: docs_0,
    },
    {
      info: { path: "features.mdx", fullPath: "content\\docs\\features.mdx" },
      data: docs_1,
    },
    {
      info: {
        path: "getting-started.mdx",
        fullPath: "content\\docs\\getting-started.mdx",
      },
      data: docs_2,
    },
    {
      info: { path: "index.mdx", fullPath: "content\\docs\\index.mdx" },
      data: docs_3,
    },
    {
      info: {
        path: "installation.mdx",
        fullPath: "content\\docs\\installation.mdx",
      },
      data: docs_4,
    },
  ],
  [
    {
      info: { path: "meta.json", fullPath: "content\\docs\\meta.json" },
      data: {
        title: "Dokumentacja",
        pages: ["index", "installation", "getting-started", "features", "faq"],
      },
    },
  ],
);
