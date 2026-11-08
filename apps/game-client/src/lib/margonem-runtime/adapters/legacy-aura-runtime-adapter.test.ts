import {
  legacySpriteFrame,
  parseBackgroundImageUrl,
} from "./legacy-aura-runtime-adapter";

// A 4×4 sheet of 32×48 frames, as SI outfits are.
const sheet = {
  frameWidth: 32,
  frameHeight: 48,
  imageWidth: 128,
  imageHeight: 192,
};

it("reads the walking frame SI shows by moving the sheet right and up", () => {
  // player.js:727 writes `step * fw` and `-dir * fh`: step 1 facing east (dir 2).
  expect(
    legacySpriteFrame({ ...sheet, backgroundPosition: "32px -96px" }),
  ).toEqual({ sx: 96, sy: 96, sw: 32, sh: 48 });
});

it("wraps the hero's starting direction of -1 to the last row", () => {
  expect(
    legacySpriteFrame({ ...sheet, backgroundPosition: "0px 48px" }),
  ).toEqual({ sx: 0, sy: 144, sw: 32, sh: 48 });
});

it("reads the sprite url the game set as the element background", () => {
  expect(
    parseBackgroundImageUrl('url("blob:https://pl.margonem.pl/1f2e")'),
  ).toBe("blob:https://pl.margonem.pl/1f2e");
  expect(parseBackgroundImageUrl("")).toBeNull();
});
