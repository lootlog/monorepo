import emittedContractJson from "./contract.json" with { type: "json" };

type MutableFieldType = {
  codecId: string;
  typeParams?: { typeName: string };
};

type MutableContract = typeof emittedContractJson & {
  domain: {
    namespaces: {
      public: {
        models: Record<
          string,
          { fields: Record<string, { type: MutableFieldType }> }
        >;
      };
    };
  };
  storage: {
    namespaces: {
      public: {
        entries: {
          table: Record<
            string,
            {
              columns: Record<
                string,
                { codecId: string; typeParams?: { typeName: string } }
              >;
            }
          >;
        };
      };
    };
  };
};

const contractJson = structuredClone(emittedContractJson) as MutableContract;
const nativeEnumArrayTypeNames = new Set<string>();

// Prisma RC currently cannot construct the domain codec for native enum
// arrays. Their elements are text-compatible; storage keeps the native enum
// codec so writes retain the correct PostgreSQL cast.
for (const [modelName, fieldName] of [
  ["LootlogConfigNpc", "allowedRarities"],
  ["Role", "permissions"],
] as const) {
  const field =
    contractJson.domain.namespaces.public.models[modelName]?.fields[fieldName];
  if (field) {
    field.type.codecId = "pg/text@1";
    delete field.type.typeParams;
  }
  const column =
    contractJson.storage.namespaces.public.entries.table[modelName]?.columns[
      fieldName
    ];
  if (column) {
    const typeName = column.typeParams?.typeName;
    if (typeName) nativeEnumArrayTypeNames.add(typeName);
  }
}

export const runtimeNativeEnumArrayTypeNames = [...nativeEnumArrayTypeNames];
export default contractJson;
