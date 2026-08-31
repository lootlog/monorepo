type MockFunction = (...arguments_: unknown[]) => unknown;
type LegacyModelMock = Record<string, MockFunction | undefined>;
type LegacyPrismaMock = Record<string, unknown> & {
  $transaction?: MockFunction;
};

type QueryState = {
  distinct?: unknown;
  include?: Record<string, unknown>;
  orderBy?: unknown;
  select?: Record<string, unknown>;
  skip?: number;
  take?: number;
  where?: unknown;
  groupBy?: string[];
};

type MockContext = {
  modelName: string;
  prisma: LegacyPrismaMock;
};

type MockExpression = {
  field?: string;
  kind: string;
  mode?: string;
  op?: string;
  predicate?: unknown;
  value?: unknown;
  not(): MockExpression;
};

const terminalMethod = {
  all: "findMany",
  first: "findFirst",
  count: "count",
} as const;

function legacyModelName(modelName: string) {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

function queryArguments(state: QueryState) {
  return Object.fromEntries(
    Object.entries(state).filter(([, value]) => value !== undefined),
  );
}

function normalizeCount(result: unknown) {
  return result instanceof Promise
    ? result.then(normalizeCount)
    : typeof result === "object" && result !== null && "count" in result
      ? result.count
      : result;
}

function mockExpression(
  expression: Omit<MockExpression, "not">,
): MockExpression {
  const result = {
    ...expression,
    not: () => mockExpression({ kind: "mock-not", predicate: result }),
  };
  return result;
}

function createRowAccessor(): unknown {
  return new Proxy(
    {},
    {
      get: (_target, field: string) => ({
        eq: (value: unknown) =>
          mockExpression({ kind: "mock-comparison", field, op: "eq", value }),
        neq: (value: unknown) =>
          mockExpression({ kind: "mock-comparison", field, op: "neq", value }),
        gt: (value: unknown) =>
          mockExpression({ kind: "mock-comparison", field, op: "gt", value }),
        gte: (value: unknown) =>
          mockExpression({ kind: "mock-comparison", field, op: "gte", value }),
        lt: (value: unknown) =>
          mockExpression({ kind: "mock-comparison", field, op: "lt", value }),
        lte: (value: unknown) =>
          mockExpression({ kind: "mock-comparison", field, op: "lte", value }),
        in: (value: unknown) =>
          mockExpression({ kind: "mock-comparison", field, op: "in", value }),
        like: (value: unknown) =>
          mockExpression({
            kind: "mock-comparison",
            field,
            op: "contains",
            value,
          }),
        ilike: (value: unknown) =>
          mockExpression({
            kind: "mock-comparison",
            field,
            op: "contains",
            value,
          }),
        isNull: () =>
          mockExpression({
            kind: "mock-comparison",
            field,
            op: "eq",
            value: null,
          }),
        isNotNull: () =>
          mockExpression({
            kind: "mock-comparison",
            field,
            op: "neq",
            value: null,
          }),
        some: (predicate: (row: unknown) => unknown) =>
          mockExpression({
            kind: "mock-relation",
            field,
            mode: "some",
            predicate: parsePredicate(predicate(createRowAccessor())),
          }),
        none: (predicate: (row: unknown) => unknown) =>
          mockExpression({
            kind: "mock-relation",
            field,
            mode: "none",
            predicate: parsePredicate(predicate(createRowAccessor())),
          }),
        every: (predicate: (row: unknown) => unknown) =>
          mockExpression({
            kind: "mock-relation",
            field,
            mode: "every",
            predicate: parsePredicate(predicate(createRowAccessor())),
          }),
        asc: () => ({ [field]: "asc" }),
        desc: () => ({ [field]: "desc" }),
      }),
    },
  );
}

function mergePredicates(predicates: unknown[]) {
  if (
    predicates.every(
      (predicate) =>
        typeof predicate === "object" &&
        predicate !== null &&
        !Array.isArray(predicate),
    )
  ) {
    const merged: Record<string, unknown> = {};
    for (const predicate of predicates as Array<Record<string, unknown>>) {
      for (const [key, value] of Object.entries(predicate)) {
        const current = merged[key];
        merged[key] =
          typeof current === "object" &&
          current !== null &&
          !Array.isArray(current) &&
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
            ? { ...current, ...value }
            : value;
      }
    }
    return merged;
  }
  return { AND: predicates };
}

function parsePredicate(expression: unknown): unknown {
  if (typeof expression !== "object" || expression === null) {
    return expression;
  }
  const node = expression as Record<string, unknown>;
  if (node.kind === "and") {
    return mergePredicates((node.exprs as unknown[]).map(parsePredicate));
  }
  if (node.kind === "or") {
    return { OR: (node.exprs as unknown[]).map(parsePredicate) };
  }
  if (node.kind === "mock-not") {
    return { NOT: parsePredicate(node.predicate) };
  }
  if (node.kind === "mock-relation") {
    return {
      [String(node.field)]: {
        [String(node.mode)]: node.predicate,
      },
    };
  }
  if (node.kind === "mock-comparison") {
    const field = String(node.field);
    if (node.op === "eq") {
      return { [field]: node.value };
    }
    if (node.op === "neq") {
      return { [field]: { not: node.value } };
    }
    return { [field]: { [String(node.op)]: node.value } };
  }
  return expression;
}

function rememberResult(context: MockContext, result: unknown): unknown {
  const remember = (value: unknown) => {
    if (context.modelName === "EventMap") {
      context.prisma.__eventMaps = Array.isArray(value) ? value : [value];
    }
    if (context.modelName === "Event" || context.modelName === "EventHeroNpc") {
      const records = Array.isArray(value) ? value : [value];
      context.prisma.__eventMaps = records.flatMap((record) => {
        if (typeof record !== "object" || record === null) {
          return [];
        }
        const object = record as {
          heroNpcs?: Array<{
            maps?: unknown[];
            locations?: Array<{ maps?: unknown[] }>;
          }>;
          maps?: unknown[];
          locations?: Array<{ maps?: unknown[] }>;
        };
        const heroes = object.heroNpcs ?? [object];
        return heroes.flatMap((hero) => [
          ...(hero.maps ?? []),
          ...(hero.locations ?? []).flatMap((location) => location.maps ?? []),
        ]);
      });
    }
    const records = Array.isArray(value) ? value : [value];
    const members = records.flatMap((record) => {
      if (typeof record !== "object" || record === null) {
        return [];
      }
      const object = record as {
        assignedMembers?: unknown[];
        member?: unknown;
        members?: unknown[];
      };
      return [
        ...(context.modelName === "Member" ? [record] : []),
        ...(object.assignedMembers ?? []),
        ...(object.member ? [object.member] : []),
        ...(object.members ?? []),
      ];
    });
    if (members.length > 0) {
      const knownMembers = (context.prisma.__members as unknown[]) ?? [];
      context.prisma.__members = [...knownMembers, ...members];
    }
    return value;
  };
  return result instanceof Promise ? result.then(remember) : remember(result);
}

function missingAllResult(context: MockContext) {
  if (context.modelName === "EventMapToMember") {
    const maps =
      (context.prisma.__eventMaps as Array<{
        id: string;
        assignedMembers?: Array<{ id: number }>;
      }>) ?? [];
    return maps.flatMap((map) =>
      (map?.assignedMembers ?? []).map((member) => ({
        a: map.id,
        b: member.id,
        member,
      })),
    );
  }
  if (context.modelName === "MemberToRole") {
    const members =
      (context.prisma.__members as Array<{
        id: number;
        roles?: unknown[];
      }>) ?? [];
    const links = members.flatMap((member) =>
      (member.roles ?? []).map((role) => ({
        a: member.id,
        b: (role as { id?: string }).id,
        role,
      })),
    );
    return Array.from(
      new Map(links.map((link) => [`${link.a}:${link.b}`, link])).values(),
    );
  }
  return [];
}

function missingFirstResult(context: MockContext) {
  if (context.modelName === "Member" && context.prisma.member === undefined) {
    return { id: 1 };
  }
  return null;
}

function createQuery(
  model: LegacyModelMock,
  context: MockContext,
  state: QueryState = {},
): unknown {
  const chain = {
    where(where: unknown) {
      const nextWhere =
        typeof where === "function"
          ? parsePredicate(where(createRowAccessor()))
          : where;
      return createQuery(model, context, {
        ...state,
        where:
          state.where === undefined
            ? nextWhere
            : mergePredicates([state.where, nextWhere]),
      });
    },
    select(...fields: unknown[]) {
      return createQuery(model, context, {
        ...state,
        select: Object.fromEntries(
          fields.map((field) => [String(field), true]),
        ),
      });
    },
    include(relation: unknown) {
      return createQuery(model, context, {
        ...state,
        include: { ...state.include, [String(relation)]: true },
      });
    },
    orderBy(orderBy: unknown) {
      const normalizedOrderBy = Array.isArray(orderBy)
        ? orderBy.map((entry) =>
            typeof entry === "function" ? entry(createRowAccessor()) : entry,
          )
        : typeof orderBy === "function"
          ? orderBy(createRowAccessor())
          : orderBy;
      return createQuery(model, context, {
        ...state,
        orderBy: normalizedOrderBy,
      });
    },
    take(take: number) {
      return createQuery(model, context, { ...state, take });
    },
    limit(take: number) {
      return createQuery(model, context, { ...state, take });
    },
    skip(skip: number) {
      return createQuery(model, context, { ...state, skip });
    },
    offset(skip: number) {
      return createQuery(model, context, { ...state, skip });
    },
    distinct(distinct: unknown) {
      return createQuery(model, context, { ...state, distinct });
    },
    groupBy(...fields: string[]) {
      return createQuery(model, context, { ...state, groupBy: fields });
    },
    create(data: unknown) {
      return rememberResult(
        context,
        model.create?.({ ...queryArguments(state), data }) ?? data,
      );
    },
    update(data: unknown) {
      return rememberResult(
        context,
        model.update?.({ ...queryArguments(state), data }) ?? data,
      );
    },
    delete() {
      return model.delete?.(queryArguments(state)) ?? null;
    },
    upsert(data: unknown) {
      return (
        model.upsert?.({ ...queryArguments(state), ...(data as object) }) ??
        (data as { create?: unknown }).create
      );
    },
    createAndCount(data: unknown) {
      const result = model.createMany?.({ ...queryArguments(state), data });
      return result === undefined
        ? Array.isArray(data)
          ? data.length
          : 1
        : normalizeCount(result);
    },
    updateAndCount(data: unknown) {
      const result = model.updateMany?.({ ...queryArguments(state), data });
      return result === undefined ? 0 : normalizeCount(result);
    },
    deleteAndCount() {
      const result = model.deleteMany?.(queryArguments(state));
      return result === undefined ? 0 : normalizeCount(result);
    },
  } as Record<string, unknown>;

  for (const [nativeMethod, legacyMethod] of Object.entries(terminalMethod)) {
    chain[nativeMethod] = () => {
      const fallback = nativeMethod === "first" ? model.findUnique : undefined;
      const operation = model[legacyMethod] ?? fallback;
      const primaryResult = operation?.(queryArguments(state));
      const operationResult =
        primaryResult instanceof Promise && fallback && fallback !== operation
          ? primaryResult.then((value) =>
              value === undefined ? fallback(queryArguments(state)) : value,
            )
          : primaryResult === undefined && fallback && fallback !== operation
            ? fallback(queryArguments(state))
            : primaryResult;
      const result =
        operationResult === undefined
          ? nativeMethod === "all"
            ? missingAllResult(context)
            : nativeMethod === "count"
              ? 0
              : missingFirstResult(context)
          : operationResult;
      return rememberResult(context, result);
    };
  }

  chain.aggregate = (projection: unknown) => {
    if (typeof projection !== "function") {
      return model.aggregate?.(queryArguments(state)) ?? {};
    }
    const aggregate = new Proxy(
      {},
      {
        get: (_target, operation: string) => (field: string) => ({
          field,
          operation,
        }),
      },
    );
    const projected = projection(aggregate) as Record<
      string,
      { field: string; operation: string }
    >;
    const legacyProjection: Record<string, Record<string, true>> = {};
    for (const { field, operation } of Object.values(projected)) {
      const legacyOperation = `_${operation}`;
      legacyProjection[legacyOperation] = {
        ...legacyProjection[legacyOperation],
        [field]: true,
      };
    }
    const arguments_ = queryArguments(state);
    delete arguments_.groupBy;
    const operationResult = state.groupBy
      ? model.groupBy?.({
          ...arguments_,
          by: state.groupBy,
          ...legacyProjection,
        })
      : model.aggregate?.({ ...arguments_, ...legacyProjection });
    const normalize = (value: unknown) => {
      if (state.groupBy && Array.isArray(value)) {
        return value.map((row) => ({
          ...row,
          ...Object.fromEntries(
            Object.entries(projected).map(([alias, descriptor]) => [
              alias,
              (row as Record<string, Record<string, unknown>>)[
                `_${descriptor.operation}`
              ]?.[descriptor.field] ?? null,
            ]),
          ),
        }));
      }
      const result = (value ?? {}) as Record<string, Record<string, unknown>>;
      return Object.fromEntries(
        Object.entries(projected).map(([alias, descriptor]) => [
          alias,
          result[`_${descriptor.operation}`]?.[descriptor.field] ?? null,
        ]),
      );
    };
    return operationResult instanceof Promise
      ? operationResult.then(normalize)
      : normalize(operationResult);
  };

  return chain;
}

function createOrm(prisma: LegacyPrismaMock) {
  return {
    public: new Proxy(
      {},
      {
        get: (_target, modelName: string) => {
          const model = prisma[legacyModelName(modelName)];
          return createQuery(
            typeof model === "object" && model !== null
              ? (model as LegacyModelMock)
              : {},
            { modelName, prisma },
          );
        },
      },
    ),
  };
}

export function attachPrismaOrmMock<T extends LegacyPrismaMock>(prisma: T): T {
  const mutablePrisma = prisma as LegacyPrismaMock;
  mutablePrisma.__eventMaps = [];
  mutablePrisma.__members = [];

  if (!("orm" in prisma)) {
    Object.defineProperty(prisma, "orm", {
      configurable: true,
      enumerable: true,
      get: () => createOrm(prisma),
    });
  }

  if (!("transaction" in prisma)) {
    Object.defineProperty(prisma, "transaction", {
      configurable: true,
      enumerable: true,
      value: (operation: (transaction: unknown) => unknown) => {
        const callback = (transaction: unknown) =>
          operation(
            attachPrismaOrmMock((transaction ?? prisma) as LegacyPrismaMock),
          );
        if (!prisma.$transaction) {
          return callback(prisma);
        }
        const transactionResult = prisma.$transaction(callback);
        return transactionResult === undefined
          ? callback(prisma)
          : transactionResult;
      },
    });
  }

  if (!("raw" in prisma)) {
    Object.defineProperty(prisma, "raw", {
      configurable: true,
      enumerable: true,
      value: {
        sql: () => ({
          affectedCount: () => ({ build: () => ({}) }),
        }),
      },
    });
  }

  if (!("execute" in prisma)) {
    Object.defineProperty(prisma, "execute", {
      configurable: true,
      enumerable: true,
      value: () => Promise.resolve(0),
    });
  }

  if (!("runtime" in prisma)) {
    Object.defineProperty(prisma, "runtime", {
      configurable: true,
      enumerable: true,
      value: () => ({
        execute: () => Promise.resolve({ affectedRows: 1 }),
      }),
    });
  }

  return prisma;
}
