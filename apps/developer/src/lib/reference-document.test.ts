import { describe, expect, test } from "bun:test";
import main from "@lootlog/sdk/openapi/main.json";
import activity from "@lootlog/sdk/openapi/activity.json";
import battlelog from "@lootlog/sdk/openapi/battlelog.json";
import catalog from "@lootlog/sdk/openapi/catalog.json";
import search from "@lootlog/sdk/openapi/search.json";
import {
  getOperationTags,
  decodeReferenceDocument,
} from "~/lib/reference-document";
import { referenceMetadata } from "~/lib/reference-metadata";
import { PUBLIC_API_SERVICES } from "@lootlog/schema/api-services";

const specs = { main, activity, battlelog, catalog, search };

describe("API reference metadata", () => {
  // Scalar hides a tag that no x-tagGroups entry lists, so a new API group
  // without metadata would silently drop its operations from the sidebar.
  test.each(PUBLIC_API_SERVICES)(
    "%s lists every operation tag in exactly one named group",
    (service) => {
      const metadata = referenceMetadata[service];
      const grouped = metadata.groups.flatMap((group) => group.tags);
      const document = decodeReferenceDocument(specs[service]);

      for (const tag of getOperationTags(document)) {
        expect(metadata.tags[tag], tag).toBeDefined();
        expect(
          grouped.filter((name) => name === tag),
          tag,
        ).toHaveLength(1);
      }
    },
  );
});
