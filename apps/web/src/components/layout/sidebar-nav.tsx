import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { Separator } from "@lootlog/ui/components/separator";
import { cn } from "@lootlog/ui/lib/utils";
import { useState, type ReactNode } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Fragment } from "react/jsx-runtime";
import { motion } from "framer-motion";
import { useTheme } from "@/hooks/context/use-theme";

export interface MenuItem {
  label: string;
  icon: ReactNode;
  path: string;
  available: boolean;
  enabled: boolean;
  divided?: boolean;
  badge?: {
    content: string | number;
    variant?: "default" | "secondary" | "destructive" | "outline" | "white";
  };
  highlight?: boolean;
}

interface SidebarNavProps {
  items: MenuItem[];
  basePath?: string;
  header?: ReactNode;
  beforeItems?: ReactNode;
  onItemClick?: (item: MenuItem, event: React.MouseEvent) => void;
}

const FrostFilter = () => (
  <svg width="0" height="0" className="absolute">
    <defs>
      <filter id="frost-noise" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.05"
          numOctaves="4"
          result="noise"
        />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer result="frost">
          <feFuncA type="table" tableValues="0 0.08 0.15 0.12 0.08" />
        </feComponentTransfer>
        <feFlood floodColor="rgb(220, 240, 255)" result="color" />
        <feComposite in="color" in2="frost" operator="in" />
      </filter>
    </defs>
  </svg>
);

const ScatteredCrystal = ({
  x,
  y,
  size,
  rotation,
  isVisible,
  delay,
}: {
  x: string;
  y: string;
  size: number;
  rotation: number;
  isVisible: boolean;
  delay: number;
}) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{
      left: x,
      top: y,
      transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{
      opacity: isVisible ? 0.7 : 0,
      scale: isVisible ? 1 : 0,
    }}
    transition={{
      duration: 0.4,
      delay: isVisible ? delay : 0,
      ease: "easeOut",
    }}
  >
    <svg width={size} height={size} viewBox="0 0 16 16">
      <path
        d="M8 0 L9 6 L15 6 L10 9 L12 16 L8 11 L4 16 L6 9 L1 6 L7 6 Z"
        fill="rgba(220, 240, 255, 0.6)"
        style={{
          filter: "drop-shadow(0 0 2px rgba(180, 220, 255, 0.9))",
        }}
      />
    </svg>
  </motion.div>
);

const Snowflake = ({
  x,
  y,
  size,
  isVisible,
  delay,
}: {
  x: string;
  y: string;
  size: number;
  isVisible: boolean;
  delay: number;
}) => (
  <motion.div
    className="absolute pointer-events-none"
    style={{ left: x, top: y, transform: "translate(-50%, -50%)" }}
    initial={{ opacity: 0, scale: 0, rotate: 0 }}
    animate={{
      opacity: isVisible ? 0.5 : 0,
      scale: isVisible ? 1 : 0,
      rotate: isVisible ? 360 : 0,
    }}
    transition={{
      opacity: { duration: 0.3, delay: isVisible ? delay : 0 },
      scale: { duration: 0.3, delay: isVisible ? delay : 0 },
      rotate: { duration: 8, repeat: Infinity, ease: "linear" },
    }}
  >
    <svg width={size} height={size} viewBox="0 0 24 24">
      <g fill="none" stroke="rgba(255, 255, 255, 0.7)" strokeWidth="1">
        <line x1="12" y1="2" x2="12" y2="22" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        <line x1="4.93" y1="19.07" x2="19.07" y2="4.93" />
        <line x1="12" y1="2" x2="10" y2="5" />
        <line x1="12" y1="2" x2="14" y2="5" />
        <line x1="12" y1="22" x2="10" y2="19" />
        <line x1="12" y1="22" x2="14" y2="19" />
        <line x1="2" y1="12" x2="5" y2="10" />
        <line x1="2" y1="12" x2="5" y2="14" />
        <line x1="22" y1="12" x2="19" y2="10" />
        <line x1="22" y1="12" x2="19" y2="14" />
      </g>
    </svg>
  </motion.div>
);

const IceCracks = ({ isVisible }: { isVisible: boolean }) => (
  <motion.svg
    className="absolute inset-0 w-full h-full pointer-events-none"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    initial={{ opacity: 0 }}
    animate={{ opacity: isVisible ? 1 : 0 }}
    transition={{ duration: 0.3 }}
  >
    <motion.path
      d="M50 50 L30 30 L20 35 M30 30 L25 20"
      fill="none"
      stroke="rgba(200, 230, 255, 0.4)"
      strokeWidth="0.5"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: isVisible ? 1 : 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    />
    <motion.path
      d="M50 50 L70 35 L80 40 M70 35 L75 25"
      fill="none"
      stroke="rgba(200, 230, 255, 0.35)"
      strokeWidth="0.5"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: isVisible ? 1 : 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    />
    <motion.path
      d="M50 50 L35 70 L30 80 M35 70 L25 75"
      fill="none"
      stroke="rgba(200, 230, 255, 0.3)"
      strokeWidth="0.5"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: isVisible ? 1 : 0 }}
      transition={{ duration: 0.55, delay: 0.35 }}
    />
    <motion.path
      d="M50 50 L65 65 L75 70 M65 65 L70 80"
      fill="none"
      stroke="rgba(200, 230, 255, 0.35)"
      strokeWidth="0.5"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: isVisible ? 1 : 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
    />
  </motion.svg>
);

const crystalPositions = [
  { x: "10%", y: "20%", size: 10, rotation: 0, delay: 0.1 },
  { x: "85%", y: "25%", size: 12, rotation: 30, delay: 0.15 },
  { x: "20%", y: "75%", size: 11, rotation: 60, delay: 0.2 },
  { x: "90%", y: "70%", size: 9, rotation: 15, delay: 0.25 },
  { x: "50%", y: "15%", size: 8, rotation: 45, delay: 0.18 },
  { x: "45%", y: "85%", size: 10, rotation: 20, delay: 0.22 },
  { x: "5%", y: "50%", size: 9, rotation: 75, delay: 0.28 },
  { x: "95%", y: "45%", size: 11, rotation: 10, delay: 0.3 },
  { x: "30%", y: "40%", size: 7, rotation: 50, delay: 0.35 },
  { x: "70%", y: "55%", size: 8, rotation: 25, delay: 0.38 },
];

const snowflakePositions = [
  { x: "25%", y: "30%", size: 14, delay: 0.4 },
  { x: "75%", y: "65%", size: 12, delay: 0.5 },
  { x: "60%", y: "20%", size: 10, delay: 0.45 },
  { x: "35%", y: "70%", size: 11, delay: 0.55 },
];

const RukiaBorderGlow = ({
  children,
  isHovered,
  isActive,
}: {
  children: ReactNode;
  isHovered: boolean;
  isActive: boolean;
}) => {
  const isFrozen = isHovered || isActive;

  return (
    <div className="relative overflow-hidden rounded-md">
      {/* SVG Filter Definition */}
      <FrostFilter />

      <motion.div
        className="absolute inset-0 rounded-md pointer-events-none overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: isFrozen ? 1 : 0 }}
        transition={{ duration: 0.4 }}
      >
        <div
          className="absolute inset-0"
          style={{
            filter: "url(#frost-noise)",
            background: "white",
          }}
        />
      </motion.div>

      <motion.div
        className="absolute inset-0 rounded-md pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(255, 255, 255, 0.25) 0%, transparent 50%), " +
            "radial-gradient(ellipse at 70% 80%, rgba(200, 230, 255, 0.2) 0%, transparent 50%), " +
            "linear-gradient(135deg, rgba(220, 240, 255, 0.15) 0%, rgba(200, 230, 255, 0.1) 50%, rgba(220, 240, 255, 0.15) 100%)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isFrozen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />

      <motion.div
        className="absolute inset-0 rounded-md pointer-events-none overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: isFrozen ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, transparent 40%), " +
              "linear-gradient(0deg, rgba(255, 255, 255, 0.2) 0%, transparent 40%), " +
              "linear-gradient(90deg, rgba(255, 255, 255, 0.15) 0%, transparent 30%), " +
              "linear-gradient(270deg, rgba(255, 255, 255, 0.15) 0%, transparent 30%)",
          }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: isFrozen ? 1 : 0.8, opacity: isFrozen ? 1 : 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </motion.div>

      <IceCracks isVisible={isFrozen} />

      {crystalPositions.map((crystal, index) => (
        <ScatteredCrystal
          key={index}
          x={crystal.x}
          y={crystal.y}
          size={crystal.size}
          rotation={crystal.rotation}
          isVisible={isFrozen}
          delay={crystal.delay}
        />
      ))}

      {snowflakePositions.map((snowflake, index) => (
        <Snowflake
          key={index}
          x={snowflake.x}
          y={snowflake.y}
          size={snowflake.size}
          isVisible={isFrozen}
          delay={snowflake.delay}
        />
      ))}

      <motion.div
        className="absolute inset-0 rounded-md pointer-events-none"
        style={{
          backdropFilter: isFrozen ? "blur(1px)" : "blur(0px)",
          WebkitBackdropFilter: isFrozen ? "blur(1px)" : "blur(0px)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isFrozen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />

      <motion.div
        className="absolute inset-0 rounded-md pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{
          opacity: isFrozen ? 1 : 0,
          boxShadow: isFrozen
            ? "inset 0 0 12px 3px rgba(200, 230, 255, 0.4), 0 0 15px 3px rgba(180, 220, 255, 0.3)"
            : "inset 0 0 0px 0px transparent",
        }}
        transition={{ duration: 0.3 }}
      />

      {isActive && (
        <>
          <motion.div
            className="absolute inset-0 rounded-md pointer-events-none"
            style={{
              background:
                "linear-gradient(135deg, rgba(220, 240, 255, 0.2) 0%, rgba(200, 230, 255, 0.15) 50%, rgba(220, 240, 255, 0.2) 100%)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
          <motion.div className="absolute inset-0 rounded-md pointer-events-none overflow-hidden">
            <motion.div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.5) 50%, transparent 60%)",
              }}
              animate={{
                x: ["-200%", "200%"],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                repeatDelay: 1.5,
                ease: "easeInOut",
              }}
            />
          </motion.div>
          <motion.div
            className="absolute inset-0 rounded-md pointer-events-none border-2 border-cyan-200/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
        </>
      )}

      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-md pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at center, rgba(255, 255, 255, 0.7) 0%, rgba(220, 240, 255, 0.4) 30%, transparent 60%)",
          }}
          initial={{ opacity: 1, scale: 0.8 }}
          animate={{ opacity: 0, scale: 1.3 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      )}

      <div className="relative z-10">{children}</div>
    </div>
  );
};

const FrozenSidebarBackground = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    {[
      { x: "15%", y: "8%", size: 12, delay: 0 },
      { x: "80%", y: "15%", size: 10, delay: 2 },
      { x: "25%", y: "35%", size: 14, delay: 1 },
      { x: "70%", y: "45%", size: 11, delay: 3 },
      { x: "10%", y: "60%", size: 13, delay: 2 },
      { x: "85%", y: "70%", size: 9, delay: 1 },
      { x: "40%", y: "85%", size: 12, delay: 4 },
      { x: "60%", y: "92%", size: 10, delay: 2 },
    ].map((sf, i) => (
      <motion.div
        key={i}
        className="absolute"
        style={{ left: sf.x, top: sf.y }}
        animate={{
          y: [0, 8, 0],
          rotate: [0, 360],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          y: { duration: 6 + sf.delay, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 20, repeat: Infinity, ease: "linear" },
          opacity: { duration: 4, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        <svg width={sf.size} height={sf.size} viewBox="0 0 24 24">
          <g fill="none" stroke="rgba(200, 230, 255, 0.4)" strokeWidth="1">
            <line x1="12" y1="2" x2="12" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            <line x1="4.93" y1="19.07" x2="19.07" y2="4.93" />
            <line x1="12" y1="2" x2="10" y2="5" />
            <line x1="12" y1="2" x2="14" y2="5" />
            <line x1="12" y1="22" x2="10" y2="19" />
            <line x1="12" y1="22" x2="14" y2="19" />
          </g>
        </svg>
      </motion.div>
    ))}

    {[
      { x: "5%", y: "20%", size: 8, rotation: 15 },
      { x: "92%", y: "40%", size: 10, rotation: -20 },
      { x: "8%", y: "75%", size: 9, rotation: 30 },
      { x: "88%", y: "88%", size: 7, rotation: -10 },
    ].map((crystal, i) => (
      <motion.div
        key={`crystal-${i}`}
        className="absolute"
        style={{
          left: crystal.x,
          top: crystal.y,
          transform: `rotate(${crystal.rotation}deg)`,
        }}
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 3 + i, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg width={crystal.size} height={crystal.size} viewBox="0 0 16 16">
          <path
            d="M8 0 L9 6 L15 6 L10 9 L12 16 L8 11 L4 16 L6 9 L1 6 L7 6 Z"
            fill="rgba(220, 240, 255, 0.5)"
            style={{ filter: "drop-shadow(0 0 2px rgba(180, 220, 255, 0.6))" }}
          />
        </svg>
      </motion.div>
    ))}
  </div>
);

export const SidebarNav = ({
  items,
  basePath = "",
  header,
  beforeItems,
  onItemClick,
}: SidebarNavProps) => {
  const { pathname } = useLocation();
  const { theme } = useTheme();
  const isRukiaTheme = theme === "rukia";

  return (
    <div className="relative flex flex-col w-full gap-1 flex-1">
      {isRukiaTheme && <FrozenSidebarBackground />}
      {header && (
        <div className="relative h-14 min-h-14 flex flex-row items-center justify-between border-b mb-2 px-2 font-semibold">
          {header}
        </div>
      )}
      {beforeItems}
      {items.map(
        ({
          divided,
          icon,
          path,
          label,
          available,
          enabled,
          badge,
          highlight,
        }) => {
          const url = `${basePath}${path}`;
          const normalizedPathname = pathname.replace(/\/$/, "");
          const normalizedUrl = url.replace(/\/$/, "");
          const isActive =
            path === ""
              ? normalizedPathname === normalizedUrl
              : normalizedPathname === normalizedUrl ||
                pathname.startsWith(`${normalizedUrl}/`);

          return (
            enabled && (
              <Fragment key={path}>
                {divided && <Separator className="my-2" />}
                <SidebarNavItem
                  url={url}
                  path={path}
                  available={available}
                  isActive={isActive}
                  icon={icon}
                  label={label}
                  badge={badge}
                  highlight={highlight}
                  isRukiaTheme={isRukiaTheme}
                  onItemClick={(e) => {
                    const item = items.find((item) => item.path === path);
                    if (item) {
                      onItemClick?.(item, e);
                    }
                  }}
                />
              </Fragment>
            )
          );
        },
      )}
    </div>
  );
};

const SidebarNavItem = ({
  url,
  path,
  available,
  isActive,
  icon,
  label,
  badge,
  highlight,
  isRukiaTheme,
  onItemClick,
}: {
  url: string;
  path: string;
  available: boolean;
  isActive: boolean;
  icon: ReactNode;
  label: string;
  badge?: MenuItem["badge"];
  highlight?: boolean;
  isRukiaTheme: boolean;
  onItemClick: (e: React.MouseEvent) => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const buttonContent = (
    <Button
      variant={isActive ? "default" : "ghost"}
      size="sm"
      className={cn(
        "justify-between w-full font-semibold transition",
        highlight &&
          !isActive && [
            "relative overflow-hidden",
            "bg-yellow-500/10 hover:bg-yellow-500/20",
            "border border-yellow-500/30",
            "shadow-[0_0_12px_rgba(234,179,8,0.3)]",
            "animate-pulse",
          ],
      )}
      disabled={!available}
    >
      <div className="flex items-center">
        {icon}
        {label}
      </div>
      {badge && (
        <Badge
          variant={isActive ? "white" : (badge.variant ?? "default")}
          className="ml-auto"
        >
          {badge.content}
        </Badge>
      )}
    </Button>
  );

  return (
    <div
      className="w-full px-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link
        to={url}
        key={path}
        onClick={(e) => {
          if (!available) e.preventDefault();
          onItemClick(e);
        }}
        className={cn({
          "hover:cursor-not-allowed": !available,
        })}
      >
        {isRukiaTheme ? (
          <RukiaBorderGlow isHovered={isHovered} isActive={isActive}>
            {buttonContent}
          </RukiaBorderGlow>
        ) : (
          buttonContent
        )}
      </Link>
    </div>
  );
};
