"use client";

import * as React from "react";
import { cn } from "@lootlog/ui/lib/utils";

function checkCanRunHeavyEffects(): boolean {
  if (typeof window === "undefined") return true; // SSR - assume supported

  // Respect user's motion preference
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }

  // Check for WebGL support (indicates hardware acceleration)
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return false;
  } catch {
    return false;
  }

  // Check device memory (if available) - low memory devices may struggle
  if ("deviceMemory" in navigator && (navigator.deviceMemory as number) < 4) {
    return false;
  }

  // Check hardware concurrency - single/dual core devices may struggle
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4) {
    return false;
  }

  return true;
}

type ElectricBorderProps = {
  children: React.ReactNode;
  className?: string;
  enabled?: boolean;
  /**
   * Stroke/glow color. Any CSS color (hex, rgb, hsl).
   * @default "#f97316"
   */
  color?: string;
  /**
   * Animation speed multiplier (higher = faster)
   * @default 1
   */
  speed?: number;
  /**
   * Distortion intensity from the SVG displacement (0 disables warp)
   * @default 1
   */
  chaos?: number;
  /**
   * Border width in pixels
   * @default 2
   */
  thickness?: number;
  /**
   * Border radius
   * @default "xl"
   */
  radius?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
};

const radiusMap = {
  sm: "0.125rem",
  md: "0.375rem",
  lg: "0.5rem",
  xl: "0.75rem",
  "2xl": "1rem",
  "3xl": "1.5rem",
};

function hexToRgba(hex: string, alpha = 1): string {
  const match = hex.replace(/^#/, "").match(/.{1,2}/g);
  if (!match || match.length < 3) return hex;
  const [r, g, b] = match.map((x) => Number.parseInt(x, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function ElectricBorder({
  children,
  className,
  enabled = true,
  color = "#f97316",
  speed = 1,
  chaos = 1,
  thickness = 2,
  radius = "xl",
}: ElectricBorderProps) {
  const rawId = React.useId().replace(/[:]/g, "");
  const filterId = `turbulent-displace-${rawId}`;
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const strokeRef = React.useRef<HTMLDivElement | null>(null);

  const borderRadius = radiusMap[radius];

  const updateAnim = React.useCallback(() => {
    const svg = svgRef.current;
    const host = rootRef.current;
    if (!svg || !host) return;

    if (strokeRef.current) {
      strokeRef.current.style.filter = `url(#${filterId})`;
    }

    const width = Math.max(
      1,
      Math.round(host.clientWidth || host.getBoundingClientRect().width || 0),
    );
    const height = Math.max(
      1,
      Math.round(host.clientHeight || host.getBoundingClientRect().height || 0),
    );

    const dyAnims = Array.from(
      svg.querySelectorAll('feOffset > animate[attributeName="dy"]'),
    );
    if (dyAnims.length >= 2) {
      dyAnims[0]?.setAttribute("values", `${height}; 0`);
      dyAnims[1]?.setAttribute("values", `0; -${height}`);
    }

    const dxAnims = Array.from(
      svg.querySelectorAll('feOffset > animate[attributeName="dx"]'),
    );
    if (dxAnims.length >= 2) {
      dxAnims[0]?.setAttribute("values", `${width}; 0`);
      dxAnims[1]?.setAttribute("values", `0; -${width}`);
    }

    const baseDur = 6;
    const dur = Math.max(0.001, baseDur / (speed || 1));
    [...dyAnims, ...dxAnims].forEach((a) => a.setAttribute("dur", `${dur}s`));

    const disp = svg.querySelector("feDisplacementMap");
    if (disp) disp.setAttribute("scale", String(30 * (chaos || 1)));

    const filterEl = svg.querySelector<SVGFilterElement>(
      `#${CSS.escape(filterId)}`,
    );
    if (filterEl) {
      filterEl.setAttribute("x", "-200%");
      filterEl.setAttribute("y", "-200%");
      filterEl.setAttribute("width", "500%");
      filterEl.setAttribute("height", "500%");
    }

    requestAnimationFrame(() => {
      [...dyAnims, ...dxAnims].forEach((a: Element) => {
        if (
          "beginElement" in a &&
          typeof (a as SVGAnimateElement).beginElement === "function"
        ) {
          try {
            (a as SVGAnimateElement).beginElement();
          } catch {
            // Safari may throw
          }
        }
      });
    });
  }, [filterId, speed, chaos]);

  React.useEffect(() => {
    updateAnim();
  }, [speed, chaos, updateAnim]);

  React.useLayoutEffect(() => {
    if (!rootRef.current) return;
    const ro = new ResizeObserver(() => updateAnim());
    ro.observe(rootRef.current);
    updateAnim();
    return () => ro.disconnect();
  }, [updateAnim]);

  const [canRunEffects, setCanRunEffects] = React.useState(true);

  React.useEffect(() => {
    setCanRunEffects(checkCanRunHeavyEffects());
  }, []);

  if (!enabled) {
    return <>{children}</>;
  }

  // Fallback for browsers without WebGL/hardware acceleration or weak devices
  if (!canRunEffects) {
    return (
      <div
        className={cn("relative", className)}
        style={{
          borderRadius,
          borderWidth: thickness,
          borderStyle: "solid",
          borderColor: color,
        }}
      >
        {children}
      </div>
    );
  }

  const inheritRadius = {
    borderRadius,
  };

  const strokeStyle: React.CSSProperties = {
    ...inheritRadius,
    borderWidth: thickness,
    borderStyle: "solid",
    borderColor: color,
  };

  const glow1Style: React.CSSProperties = {
    ...inheritRadius,
    borderWidth: thickness,
    borderStyle: "solid",
    borderColor: hexToRgba(color, 0.4),
    filter: `blur(${0.5 + thickness * 0.25}px)`,
    opacity: 0.3,
  };

  const glow2Style: React.CSSProperties = {
    ...inheritRadius,
    borderWidth: thickness,
    borderStyle: "solid",
    borderColor: color,
    filter: `blur(${2 + thickness * 0.5}px)`,
    opacity: 0.3,
  };

  const bgGlowStyle: React.CSSProperties = {
    ...inheritRadius,
    transform: "scale(1.04)",
    filter: "blur(24px)",
    opacity: 0.15,
    zIndex: -1,
    background: `linear-gradient(-30deg, ${hexToRgba(color, 0.6)}, transparent, ${color})`,
  };

  return (
    <div
      ref={rootRef}
      className={cn("relative isolate", className)}
      style={{ borderRadius }}
    >
      <svg
        ref={svgRef}
        className="pointer-events-none fixed -left-[10000px] -top-[10000px] size-2.5 opacity-[0.001]"
        aria-hidden
        focusable="false"
      >
        <defs>
          <filter
            id={filterId}
            colorInterpolationFilters="sRGB"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feTurbulence
              type="turbulence"
              baseFrequency="0.02"
              numOctaves={10}
              result="noise1"
              seed={1}
            />
            <feOffset in="noise1" dx="0" dy="0" result="offsetNoise1">
              <animate
                attributeName="dy"
                values="700; 0"
                dur="6s"
                repeatCount="indefinite"
                calcMode="linear"
              />
            </feOffset>

            <feTurbulence
              type="turbulence"
              baseFrequency="0.02"
              numOctaves={10}
              result="noise2"
              seed={1}
            />
            <feOffset in="noise2" dx="0" dy="0" result="offsetNoise2">
              <animate
                attributeName="dy"
                values="0; -700"
                dur="6s"
                repeatCount="indefinite"
                calcMode="linear"
              />
            </feOffset>

            <feTurbulence
              type="turbulence"
              baseFrequency="0.02"
              numOctaves={10}
              result="noise1"
              seed={2}
            />
            <feOffset in="noise1" dx="0" dy="0" result="offsetNoise3">
              <animate
                attributeName="dx"
                values="490; 0"
                dur="6s"
                repeatCount="indefinite"
                calcMode="linear"
              />
            </feOffset>

            <feTurbulence
              type="turbulence"
              baseFrequency="0.02"
              numOctaves={10}
              result="noise2"
              seed={2}
            />
            <feOffset in="noise2" dx="0" dy="0" result="offsetNoise4">
              <animate
                attributeName="dx"
                values="0; -490"
                dur="6s"
                repeatCount="indefinite"
                calcMode="linear"
              />
            </feOffset>

            <feBlend
              in="offsetNoise1"
              in2="offsetNoise2"
              mode="color-dodge"
              result="part1"
            />
            <feBlend
              in="offsetNoise3"
              in2="offsetNoise4"
              mode="color-dodge"
              result="part2"
            />

            <feBlend
              in="part1"
              in2="part2"
              mode="color-dodge"
              result="combinedNoise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="combinedNoise"
              scale={30}
              xChannelSelector="R"
              yChannelSelector="B"
            />
          </filter>
        </defs>
      </svg>

      <div
        className="pointer-events-none absolute inset-0 z-2"
        style={inheritRadius}
      >
        <div
          ref={strokeRef}
          className="absolute inset-0 box-border"
          style={strokeStyle}
        />
        <div className="absolute inset-0 box-border" style={glow1Style} />
        <div className="absolute inset-0 box-border" style={glow2Style} />
        <div className="absolute inset-0 box-border" style={bgGlowStyle} />
      </div>

      <div className="relative z-1" style={inheritRadius}>
        {children}
      </div>
    </div>
  );
}

export { ElectricBorder, type ElectricBorderProps };
