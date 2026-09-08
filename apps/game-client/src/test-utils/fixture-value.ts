export const fixtureValue = <
  ObjectType,
  Key extends keyof ObjectType,
  Fallback,
>(
  source: ObjectType | undefined,
  key: Key,
  fallback: Fallback,
) => source?.[key] ?? fallback;

export const optionalFixtureValue = <ObjectType, Key extends keyof ObjectType>(
  source: ObjectType | undefined,
  key: Key,
): ObjectType[Key] | undefined => source?.[key];

export const nestedFixtureValue = <
  ObjectType,
  ParentKey extends keyof ObjectType,
  Key extends keyof NonNullable<ObjectType[ParentKey]>,
  Fallback,
>(
  source: ObjectType | undefined,
  parentKey: ParentKey,
  key: Key,
  fallback: Fallback,
) => source?.[parentKey]?.[key] ?? fallback;
