import type { CSSProperties, FC, PropsWithChildren } from "react";

type PingPillProps = PropsWithChildren<{
  highlighted?: boolean;
  style?: CSSProperties;
}>;

export const PingPill: FC<PingPillProps> = ({
  children,
  highlighted = false,
  style,
}) => {
  const border = highlighted ? "#eddb5e" : "#b6bbc1b0";

  return (
    <div
      className="ll:flex ll:items-center ll:gap-1 ll:whitespace-nowrap ll:rounded-[4px] ll:px-[7px] ll:py-[3px] ll:text-[11px] ll:font-bold ll:leading-[14px] ll:text-foreground"
      style={{
        background: "#3f3b3d",
        boxShadow: [
          "0 0 0 1px #150f0d inset",
          `0 0 0 1px ${border}`,
          "0 0 0 2px #150f0d",
          highlighted ? "0 0 12px #eddb5e" : "0 2px 6px rgba(0, 0, 0, 0.6)",
        ].join(", "),
        fontFamily: "Arimo, Arial, sans-serif",
        ...style,
      }}
    >
      {children}
    </div>
  );
};
