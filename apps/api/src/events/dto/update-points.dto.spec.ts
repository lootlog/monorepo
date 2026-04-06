import {
  UpdateKillPointDto,
  UpdateRankingPointsDto,
} from "./update-points.dto";

describe("Update points DTO validation", () => {
  describe("UpdateRankingPointsDto", () => {
    it("accepts decimal delta values", () => {
      expect(() =>
        UpdateRankingPointsDto.schema.parse({ pointsDelta: 1.75 }),
      ).not.toThrow();
    });

    it("accepts decimal values with more than two decimal places", () => {
      expect(() =>
        UpdateRankingPointsDto.schema.parse({ pointsDelta: 1.234 }),
      ).not.toThrow();
    });

    it("accepts negative delta values", () => {
      expect(() =>
        UpdateRankingPointsDto.schema.parse({ pointsDelta: -0.25 }),
      ).not.toThrow();
    });

    it("rejects infinity values", () => {
      expect(() =>
        UpdateRankingPointsDto.schema.parse({
          pointsDelta: Number.POSITIVE_INFINITY,
        }),
      ).toThrow();
    });
  });

  describe("UpdateKillPointDto", () => {
    it("accepts decimal values", () => {
      expect(() =>
        UpdateKillPointDto.schema.parse({ pointsDelta: 0.25 }),
      ).not.toThrow();
    });

    it("accepts decimal values with more than two decimal places", () => {
      expect(() =>
        UpdateKillPointDto.schema.parse({ pointsDelta: 0.125 }),
      ).not.toThrow();
    });

    it("accepts negative delta values", () => {
      expect(() =>
        UpdateKillPointDto.schema.parse({ pointsDelta: -0.25 }),
      ).not.toThrow();
    });
  });
});
