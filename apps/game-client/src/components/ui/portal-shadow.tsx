import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type PortalShadowProps = {
  targetRef: React.RefObject<HTMLElement>;
  boxShadow?: string;
  className?: string;
};

export const PortalShadow = ({
  targetRef,
  boxShadow = "0 0 80px 32px rgba(239,68,68,0.4)",
  className,
}: PortalShadowProps) => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!targetRef.current) return;

    const updateRect = () => {
      const r = targetRef.current!.getBoundingClientRect();
      setRect((prev) =>
        prev &&
        prev.left === r.left &&
        prev.top === r.top &&
        prev.width === r.width &&
        prev.height === r.height
          ? prev
          : r
      );
    };
    updateRect();

    const ro = new window.ResizeObserver(updateRect);
    ro.observe(targetRef.current);

    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);

    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [targetRef]);

  if (!rect) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        zIndex: 9999,
        pointerEvents: "none",
        boxShadow,
      }}
      className={className}
    />,
    document.body
  );
};
