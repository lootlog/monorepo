import { z } from "zod";
import {
  referenceMetadata,
  type ReferenceService,
} from "~/lib/reference-metadata";

export const referenceDocumentSchema = z.looseObject({
  openapi: z.string(),
  info: z.looseObject({ title: z.string() }),
  paths: z.record(z.string(), z.record(z.string(), z.unknown())),
});

export type ReferenceDocument = z.infer<typeof referenceDocumentSchema>;

// A path item also holds shared `parameters`, which carry no tags.
const operation = z.looseObject({ tags: z.array(z.string()).optional() });

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
          (entry) => operation.safeParse(entry).data?.tags ?? [],
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
