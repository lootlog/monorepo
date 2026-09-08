import { createCanvas, Image, type Canvas } from "@napi-rs/canvas";
import { vi } from "vitest";

// The browser canvas overload accepts either dimensions or existing ImageData.
const isCanvasDimension = (value: number | ImageData): value is number =>
  typeof value === "number";

/** Run browser canvas drawing against Skia, including real compositing and pixels. */
export const installTestCanvas = () => {
  const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
  const loadedImages = new WeakMap<HTMLImageElement, Canvas>();
  const canvases = new WeakMap<HTMLCanvasElement, Canvas>();
  for (const dimension of ["width", "height"] as const) {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLCanvasElement.prototype,
      dimension,
    )?.set;
    if (!setter) throw new Error("Canvas dimension setter unavailable");
    vi.spyOn(HTMLCanvasElement.prototype, dimension, "set").mockImplementation(
      function (this: HTMLCanvasElement, value: number) {
        setter.call(this, value);
        const native = canvases.get(this);
        if (native) native[dimension] = value;
      },
    );
  }
  const getCanvas = (element: HTMLCanvasElement) => {
    let canvas = canvases.get(element);
    if (!canvas) {
      canvas = createCanvas(element.width, element.height);
      canvases.set(element, canvas);
    }
    return canvas;
  };
  const getContext = (element: HTMLCanvasElement): CanvasRenderingContext2D => {
    const cached = contexts.get(element);
    if (cached) return cached;
    const native = getCanvas(element).getContext("2d");
    const drawImage = native.drawImage.bind(native);
    const createPattern = native.createPattern.bind(native);
    const createImageData = native.createImageData.bind(native);
    const getImageData = native.getImageData.bind(native);
    const getTransform = native.getTransform.bind(native);
    const browserImage = (source: CanvasImageSource) => {
      if (source instanceof HTMLCanvasElement) return getCanvas(source);
      if (source instanceof HTMLImageElement) {
        const loaded = loadedImages.get(source);
        if (loaded) return loaded;
        const image = new Image();
        image.src = source.src;
        return image;
      }
      throw new Error("Unsupported test image source");
    };
    const drawBrowserImage = (
      source: CanvasImageSource,
      ...coordinates: number[]
    ) => {
      const image = browserImage(source);
      const [a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0] =
        coordinates;
      if (coordinates.length === 2) drawImage(image, a, b);
      else if (coordinates.length === 4) drawImage(image, a, b, c, d);
      else if (coordinates.length === 8)
        drawImage(image, a, b, c, d, e, f, g, h);
      else throw new Error("Invalid drawImage coordinates");
    };
    const drawingContext = Object.assign(native, {
      canvas: element,
      getTransform: () =>
        new DOMMatrix(Array.from(getTransform().toFloat64Array())),
      createImageData: (width: number | ImageData, height?: number) =>
        Object.assign(
          isCanvasDimension(width)
            ? createImageData(width, height ?? width)
            : createImageData(width.width, width.height),
          { colorSpace: "srgb" as const },
        ),
      getImageData: (x: number, y: number, width: number, height: number) =>
        Object.assign(getImageData(x, y, width, height), {
          colorSpace: "srgb" as const,
        }),
      drawFocusIfNeeded: () => {
        throw new Error("Browser focus painting is unavailable in Skia tests");
      },
      drawImage: drawBrowserImage,
      createPattern: (source: CanvasImageSource, repetition: string | null) => {
        if (
          repetition !== null &&
          repetition !== "repeat" &&
          repetition !== "repeat-x" &&
          repetition !== "repeat-y" &&
          repetition !== "no-repeat"
        )
          throw new SyntaxError("Invalid canvas repetition");
        return createPattern(browserImage(source), repetition);
      },
    });
    // SAFETY: Skia implements the drawing API; DOM image/canvas arguments are
    // converted to their actual Skia backing objects by drawBrowserImage.
    const context = drawingContext as CanvasRenderingContext2D;
    contexts.set(element, context);
    return context;
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    function (this: HTMLCanvasElement, id: string) {
      return id === "2d" ? getContext(this) : null;
    },
  );
  const create = (width = 1024, height = 1024) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return { canvas, context: getContext(canvas) };
  };
  return {
    create,
    registerLoadedImage: (image: HTMLImageElement, canvas: HTMLCanvasElement) =>
      loadedImages.set(image, getCanvas(canvas)),
  };
};
