import { useState } from "react";
import { cn } from "cn";

/**
 * The Organization's Discord server banner behind the sidebar header. The
 * sidebar color fades in from the left so the server name stays readable in
 * every theme. A banner that fails to load leaves the plain header.
 */
export const GuildSidebarBanner = ({ src }: { src: string }) => {
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">(
    "loading",
  );

  if (status === "failed") return null;

  return (
    <div
      aria-hidden="true"
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
      <div className="absolute inset-0 bg-linear-to-r from-sidebar from-10% via-sidebar/70 via-55% to-sidebar/10" />
    </div>
  );
};
