declare module "gifenc" {
  export type GifPalette = number[][];

  export type GifWriteFrameOptions = {
    palette?: GifPalette | null;
    delay?: number;
    repeat?: number;
    transparent?: boolean;
    transparentIndex?: number;
    dispose?: number;
    colorDepth?: number;
    first?: boolean;
  };

  export type GifEncoderInstance = {
    reset: () => void;
    finish: () => void;
    bytes: () => Uint8Array;
    bytesView: () => Uint8Array;
    writeHeader: () => void;
    writeFrame: (
      index: Uint8Array,
      width: number,
      height: number,
      options?: GifWriteFrameOptions,
    ) => void;
  };

  export function GIFEncoder(options?: {
    initialCapacity?: number;
    auto?: boolean;
  }): GifEncoderInstance;

  export function quantize(
    rgba: Uint8ClampedArray | Uint8Array,
    maxColors: number,
    options?: {
      format?: "rgb565" | "rgb444" | "rgba4444";
      oneBitAlpha?: boolean | number;
      clearAlpha?: boolean;
      clearAlphaThreshold?: number;
      clearAlphaColor?: number;
    },
  ): GifPalette;

  export function applyPalette(
    rgba: Uint8ClampedArray | Uint8Array,
    palette: GifPalette,
    format?: "rgb565" | "rgb444" | "rgba4444",
  ): Uint8Array;
}
