import { QueryActivitiesDto } from "./query-activities.dto.js";

describe("QueryActivitiesDto", () => {
  it("requires seconds in timestamps with an offset", () => {
    expect(
      QueryActivitiesDto.schema.safeParse({
        startDate: "2026-09-01T12:30:00+02:00",
      }).success,
    ).toBe(true);

    expect(
      QueryActivitiesDto.schema.safeParse({
        startDate: "2026-09-01T12:30+02:00",
      }).success,
    ).toBe(false);
  });
});
