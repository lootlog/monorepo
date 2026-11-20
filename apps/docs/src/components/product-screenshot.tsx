type ProductScreenshotProps = {
  alt: string;
  src: string;
  title: string;
};

export function ProductScreenshot({ alt, src, title }: ProductScreenshotProps) {
  return (
    <figure className="docs-product-window not-prose">
      <figcaption>{title}</figcaption>
      <img
        src={src}
        alt={alt}
        width={1489}
        height={812}
        sizes="(max-width: 768px) calc(100vw - 32px), 760px"
        loading="lazy"
      />
    </figure>
  );
}
