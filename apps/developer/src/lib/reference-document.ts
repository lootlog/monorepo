import { looseStruct } from "@lootlog/schema/stored-value";
import { Option, Schema } from "effect";
import type { PublicApiService } from "@lootlog/schema/api-services";
import { referenceMetadata } from "@/lib/reference-metadata";

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

export function presentReferenceDocument(
  document: ReferenceDocument,
  service: PublicApiService,
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
