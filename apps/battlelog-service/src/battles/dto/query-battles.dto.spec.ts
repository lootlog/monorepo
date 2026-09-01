import { QueryBattlesDto } from "./query-battles.dto.js";

describe("QueryBattlesDto", () => {
  it("requires seconds in UTC timestamps", () => {
    expect(
      QueryBattlesDto.schema.safeParse({
        startDate: "2026-09-01T12:30:00Z",
      }).success,
    ).toBe(true);

    expect(
      QueryBattlesDto.schema.safeParse({
        startDate: "2026-09-01T12:30Z",
      }).success,
    ).toBe(false);
  });
});
