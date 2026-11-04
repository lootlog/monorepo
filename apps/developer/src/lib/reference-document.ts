import { looseStruct } from "@lootlog/schema/stored-value";
import { Option, Schema } from "effect";
import {
  referenceMetadata,
  type ReferenceService,
} from "~/lib/reference-metadata";

const UnknownRecord = Schema.Record(Schema.String, Schema.Unknown);

const ReferenceDocumentSchema = looseStruct({
  openapi: Schema.String,
  info: looseStruct({ title: Schema.String }),
  paths: Schema.Record(Schema.String, UnknownRecord),
});

export type ReferenceDocument = typeof ReferenceDocumentSchema.Type;

export const decodeReferenceDocument = Schema.decodeUnknownSync(
  ReferenceDocumentSchema,
);

// A path item also holds shared `parameters`, which carry no tags.
const decodeOperation = Schema.decodeUnknownOption(
  Schema.Struct({ tags: Schema.optional(Schema.Array(Schema.String)) }),
);

const sdkInstallation = [
  {
    lang: "Node",
    description:
      "Typed clients for every Lootlog service are published as [`@lootlog/sdk`](/docs/sdk).",
    source: "npm install @lootlog/sdk",
  },
];

/** The tags operations of a document use, in order of first use. */
export function getOperationTags({ paths }: ReferenceDocument) {
  return [
    ...new Set(
      Object.values(paths).flatMap((item) =>
        Object.values(item).flatMap(
          (entry) => Option.getOrUndefined(decodeOperation(entry))?.tags ?? [],
        ),
      ),
    ),
  ];
}

/**
 * The public OpenAPI document of a service as the reference shows it: served
 * from the current environment, with named and grouped tags, an introduction
 * and the SDK's install command instead of generated client libraries.
 */
export function presentReferenceDocument(
  document: ReferenceDocument,
  service: ReferenceService,
  serverUrl: string,
) {
  const metadata = referenceMetadata[service];

  return {
    ...document,
    info: {
      ...document.info,
      description: metadata.description,
      "x-scalar-sdk-installation": sdkInstallation,
    },
    servers: [{ url: serverUrl }],
    tags: getOperationTags(document).map((tag) => ({
      name: tag,
      "x-displayName": metadata.tags[tag]?.name ?? tag,
      description: metadata.tags[tag]?.description,
    })),
    "x-tagGroups": metadata.groups,
  };
}
