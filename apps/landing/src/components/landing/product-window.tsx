type ProductWindowProps = {
  alt: string;
  caption: string;
  className?: string;
  imageViewportClassName?: string;
  priority?: boolean;
  src: string;
};

export function ProductWindow({
  alt,
  caption,
  className,
  imageViewportClassName = "aspect-video",
  priority = false,
  src,
}: ProductWindowProps) {
  return (
    <figure
      className={[
        "overflow-hidden rounded-2xl bg-[#05080f] shadow-[14px_18px_48px_rgba(0,0,0,0.32)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex h-9 items-center gap-1.5 bg-[#101827] px-4">
        <span className="size-2 rounded-full bg-[#ff665b]" />
        <span className="size-2 rounded-full bg-[#ffbd3f]" />
        <span className="size-2 rounded-full bg-[#c8f135]" />
      </div>
      <div
        className={["overflow-hidden", imageViewportClassName]
          .filter(Boolean)
          .join(" ")}
      >
        <img
          src={src}
          alt={alt}
          width={1280}
          height={720}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          sizes="(max-width: 1024px) 100vw, 58vw"
          className="h-full w-full object-cover object-top"
        />
      </div>
      <figcaption className="sr-only">{caption}</figcaption>
    </figure>
  );
}
