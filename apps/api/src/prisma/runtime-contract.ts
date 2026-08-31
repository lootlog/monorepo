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

// Prisma RC currently cannot construct the runtime codec for native enum
// arrays. Their wire representation is text-compatible, while the storage
// contract still preserves the native enum type for DDL and verification.
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
    column.codecId = "pg/text@1";
    delete column.typeParams;
  }
}

export default contractJson;
