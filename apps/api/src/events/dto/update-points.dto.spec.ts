import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  UpdateKillPointDto,
  UpdateRankingPointsDto,
} from "./update-points.dto";

describe("Update points DTO validation", () => {
  describe("UpdateRankingPointsDto", () => {
    it("accepts decimal values", async () => {
      const dto = plainToInstance(UpdateRankingPointsDto, {
        totalPoints: 1.75,
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it("accepts decimal values with more than two decimal places", async () => {
      const dto = plainToInstance(UpdateRankingPointsDto, {
        totalPoints: 1.234,
      });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it("rejects negative values", async () => {
      const dto = plainToInstance(UpdateRankingPointsDto, {
        totalPoints: -0.25,
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });

    it("rejects infinity values", async () => {
      const dto = plainToInstance(UpdateRankingPointsDto, {
        totalPoints: Number.POSITIVE_INFINITY,
      });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("UpdateKillPointDto", () => {
    it("accepts decimal values", async () => {
      const dto = plainToInstance(UpdateKillPointDto, { points: 0.25 });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it("accepts decimal values with more than two decimal places", async () => {
      const dto = plainToInstance(UpdateKillPointDto, { points: 0.125 });
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it("rejects negative values", async () => {
      const dto = plainToInstance(UpdateKillPointDto, { points: -0.25 });
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
    });
  });
});
