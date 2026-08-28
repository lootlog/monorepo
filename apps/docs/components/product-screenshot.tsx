type ProductScreenshotProps = {
  alt: string;
  src: string;
  title: string;
};

export function ProductScreenshot({ alt, src, title }: ProductScreenshotProps) {
  return (
    <figure className="docs-product-window">
      <figcaption>
        <span className="docs-window-controls" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span>{title}</span>
      </figcaption>
      <img
        src={src}
        alt={alt}
        width={1280}
        height={720}
        sizes="(max-width: 768px) calc(100vw - 32px), 760px"
        loading="lazy"
      />
    </figure>
  );
}
