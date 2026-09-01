import { attachPrismaOrmMock } from "./prisma-orm.mock.js";

type TestCollection = {
  count?: unknown;
  include(
    relation: string,
    refinement?: (relation: TestCollection) => TestCollection,
  ): TestCollection;
};

describe("attachPrismaOrmMock", () => {
  it("rejects relation names missing from the emitted contract", () => {
    const prisma = attachPrismaOrmMock({ event: {} }) as unknown as {
      db: { orm: { public: { Event: TestCollection } } };
    };

    expect(() =>
      prisma.db.orm.public.Event.include("heroNpcs", (heroes) =>
        heroes.include("locations"),
      ),
    ).toThrow("Relation 'locations' not found on model 'EventHeroNpc'");
  });

  it("does not emulate the unsupported terminal count method", () => {
    const prisma = attachPrismaOrmMock({ guildDocument: {} }) as unknown as {
      db: { orm: { public: { GuildDocument: TestCollection } } };
    };

    expect(prisma.db.orm.public.GuildDocument.count).toBeUndefined();
  });
});
