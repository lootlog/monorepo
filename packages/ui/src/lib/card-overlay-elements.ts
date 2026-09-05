import { createSeededRandom, hashString } from "./seeded-random";

type OverlayVariant = {
  image: string;
  minimumSize: number;
  sizeSpread: number;
};

export function createCardOverlayElements(
  id: string,
  options: {
    prefix: string;
    minimumCount: number;
    variantThreshold: number;
    opacity: number;
    first: OverlayVariant;
    second: OverlayVariant;
  },
) {
  const random = createSeededRandom(hashString(id));
  for (let i = 0; i < 20; i++) random();
  const count = options.minimumCount + Math.floor(random() * 4);
  return Array.from({ length: count }, (_, index) => {
    const variant =
      random() > options.variantThreshold ? options.first : options.second;
    return {
      id: `${options.prefix}-${index}`,
      left: `${random() * 100}%`,
      top: `${random() * 100}%`,
      size: variant.minimumSize + random() * variant.sizeSpread,
      rotation: random() * 360,
      opacity: options.opacity + random() * options.opacity,
      image: variant.image,
    };
  });
}
