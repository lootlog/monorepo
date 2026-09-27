import type { FC } from "react";
import { PING_ICONS, type PingIconName } from "./ping-presentation";

type PingIconProps = {
  color: string;
  name: PingIconName;
  size: number;
};

export const PingIcon: FC<PingIconProps> = ({ color, name, size }) => (
  <svg
    aria-hidden="true"
    fill="none"
    height={size}
    stroke={color}
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2.4}
    viewBox="0 0 24 24"
    width={size}
  >
    <path d={PING_ICONS[name]} />
  </svg>
);
