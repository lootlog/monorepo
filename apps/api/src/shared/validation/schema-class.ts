interface RuntimeSchema {
  parse(input: unknown): unknown;
}

interface RuntimeCodec extends RuntimeSchema {
  encode(input: unknown): unknown;
}

/** Encodes and validates a value at an HTTP response boundary. */
export const encodeUnknownResponse = (
  codec: RuntimeCodec,
  value: unknown,
): unknown => codec.encode(value);

export interface SchemaClass<TSchema extends RuntimeSchema> {
  new (): ReturnType<TSchema["parse"]>;
  readonly schema: TSchema;
  readonly codec: boolean;
  create(input: unknown): ReturnType<TSchema["parse"]>;
}

/**
 * Keeps the legacy class-shaped type surface while validation is owned by the
 * schema itself. This has no decorator metadata or framework dependency.
 */
export const createSchemaClass = <TSchema extends RuntimeSchema>(
  schema: TSchema,
  options?: { codec?: boolean },
): SchemaClass<TSchema> => {
  class SchemaBackedValue {
    static readonly schema = schema;
    static readonly codec = options?.codec ?? false;

    static create(input: unknown): ReturnType<TSchema["parse"]> {
      return schema.parse(input) as ReturnType<TSchema["parse"]>;
    }
  }

  return SchemaBackedValue as SchemaClass<TSchema>;
};
