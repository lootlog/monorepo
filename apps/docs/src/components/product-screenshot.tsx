import { useState } from "react";

type ProductScreenshotProps = {
  alt: string;
  src: string;
  title: string;
};

type LoadState = "settled" | "loading" | "loaded";

export function ProductScreenshot({ alt, src, title }: ProductScreenshotProps) {
  const [loadState, setLoadState] = useState<LoadState>("settled");

  const watchLoad = (image: HTMLImageElement | null) => {
    if (image && !image.complete) setLoadState("loading");
  };

  return (
    <figure className="docs-product-window not-prose">
      <figcaption>{title}</figcaption>
      <div
        data-state={loadState}
        className="group bg-secondary data-[state=settled]:bg-transparent"
      >
        <img
          ref={watchLoad}
          src={src}
          alt={alt}
          width={1489}
          height={812}
          sizes="(max-width: 768px) calc(100vw - 32px), 760px"
          loading="lazy"
          onLoad={() => setLoadState("loaded")}
          onError={() => setLoadState("loaded")}
          className="transition-opacity duration-300 ease-out group-data-[state=loading]:opacity-0 motion-reduce:transition-none"
        />
      </div>
    </figure>
  );
}
