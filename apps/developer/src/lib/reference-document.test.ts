import { describe, expect, test } from "bun:test";
import main from "@lootlog/sdk/openapi/main.json";
import activity from "@lootlog/sdk/openapi/activity.json";
import battlelog from "@lootlog/sdk/openapi/battlelog.json";
import catalog from "@lootlog/sdk/openapi/catalog.json";
import search from "@lootlog/sdk/openapi/search.json";
import {
  getOperationTags,
  decodeReferenceDocument,
} from "@/lib/reference-document";
import { referenceMetadata } from "@/lib/reference-metadata";
import { PUBLIC_API_SERVICES } from "@lootlog/schema/api-services";

const specs = { main, activity, battlelog, catalog, search };

describe("API reference metadata", () => {
  test.each(PUBLIC_API_SERVICES)(
    "%s names exactly its operation tags, each in one group",
    (service) => {
      const metadata = referenceMetadata[service];
      const grouped = metadata.groups.flatMap((group) => group.tags);

      const operationTags = getOperationTags(
        decodeReferenceDocument(specs[service]),
      );

      expect(new Set(Object.keys(metadata.tags))).toEqual(
        new Set(operationTags),
      );
      expect(new Set(grouped)).toEqual(new Set(operationTags));
      expect(grouped).toHaveLength(operationTags.length);
    },
  );
});
