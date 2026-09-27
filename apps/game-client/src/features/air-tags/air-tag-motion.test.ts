import { AirTagMotion } from "./air-tag-motion";

describe("AirTagMotion", () => {
  it("walks a marker to a report at Margonem's walking speed and snaps a teleport", () => {
    const motion = new AirTagMotion();

    const drawnAt = (x: number, y: number, now: number) => {
      motion.beginFrame();

      const { x: drawnX, y: drawnY } = motion.position(
        { targetId: "target", x, y },
        now,
      );

      motion.endFrame();

      return [drawnX, drawnY];
    };

    expect(drawnAt(10, 10, 0)).toEqual([10, 10]);
    // Two tiles take 400 ms.
    expect(drawnAt(12, 10, 1_000)).toEqual([10, 10]);
    expect(drawnAt(12, 10, 1_200)).toEqual([11, 10]);
    // A newer report continues from where the marker is drawn.
    expect(drawnAt(11, 12, 1_200)).toEqual([11, 10]);
    expect(drawnAt(11, 12, 1_600)).toEqual([11, 12]);
    expect(drawnAt(60, 60, 1_700)).toEqual([60, 60]);
  });
});
