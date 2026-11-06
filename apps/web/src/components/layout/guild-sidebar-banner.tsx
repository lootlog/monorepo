import { useState } from "react";
import { cn } from "cn";

/**
 * The Organization's Discord server banner, shown whole: its presence grows
 * the sidebar header to the banner's 16:9 shape. A scrim under the header row
 * keeps the server name readable in every theme, and the bottom edge melts
 * into the sidebar. A banner that fails to load leaves the plain header.
 */
export const GuildSidebarBanner = ({ src }: { src: string }) => {
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">(
    "loading",
  );

  if (status === "failed") return null;

  return (
    <div
      aria-hidden="true"
      data-slot="sidebar-header-backdrop"
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-0 motion-safe:transition-opacity motion-safe:duration-300",
        status === "loaded" && "opacity-100",
      )}
    >
      <img
        src={src}
        alt=""
        decoding="async"
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("failed")}
        className="size-full object-cover"
      />
      <div className="absolute inset-x-0 top-0 h-20 bg-linear-to-b from-sidebar/85 via-sidebar/45 via-45% to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-sidebar/60 to-transparent" />
    </div>
  );
};
