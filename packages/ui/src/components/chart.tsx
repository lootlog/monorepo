"use client";

import * as React from "react";
import { isObjectRecord } from "@lootlog/schema/records";
import type { CSSPropertiesWithVariables } from "../types/css";
// Consumers load complete chart features through React.lazy; these primitives share their chart context.
// oxlint-disable-next-line react-doctor/prefer-dynamic-import
import * as RechartsPrimitive from "recharts";

import { cn } from "cn";

const RESPONSIVE_CONTAINER_INITIAL_DIMENSION = { width: 1, height: 1 };

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
  };
};

const ChartContext = React.createContext<ChartConfig | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={config}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "w-full [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer
          initialDimension={RESPONSIVE_CONTAINER_INITIAL_DIMENSION}
          minWidth={0}
        >
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, config]) => config.color,
  );

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
[data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) =>
    itemConfig.color ? `  --color-${key}: ${itemConfig.color};` : null,
  )
  .join("\n")}
}
`,
      }}
    />
  );
};

const ChartTooltip = RechartsPrimitive.Tooltip;

// Recharts retains arbitrary source-row fields for custom formatters and key lookup.
type ChartSourceRow = Record<string, unknown>;

type ChartPayloadItem = {
  dataKey?: string;
  name?: string;
  value?: number | string;
  type?: string;
  color?: string;
  fill?: string;
  payload?: ChartSourceRow;
};

const resolveTooltipItemKey = (
  configuredKey: string | undefined,
  item: ChartPayloadItem,
): string => configuredKey || item.name || item.dataKey || "value";

const resolveIndicatorColor = (
  color: string | undefined,
  item: ChartPayloadItem,
): string | number | undefined => {
  const fill = item.payload?.fill;
  return (
    color ||
    (typeof fill === "string" || typeof fill === "number" ? fill : undefined) ||
    item.color
  );
};

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: React.ComponentProps<"div"> & {
  active?: boolean;
  payload?: ChartPayloadItem[];
  label?: string | number;
  labelFormatter?: (
    label: React.ReactNode,
    payload: ChartPayloadItem[],
  ) => React.ReactNode;
  formatter?: (
    value: number | string,
    name: string,
    item: ChartPayloadItem,
    index: number,
    payload: ChartSourceRow,
  ) => React.ReactNode;
  color?: string;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  indicator?: "line" | "dot" | "dashed";
  nameKey?: string;
  labelKey?: string;
  labelClassName?: string;
}) {
  const config = useChart();

  const tooltipLabel = (function resolveTooltipLabel() {
    if (hideLabel || !payload?.length) {
      return null;
    }

    const [item] = payload;
    const key = `${labelKey || item?.dataKey || item?.name || "value"}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const value =
      !labelKey && typeof label === "string"
        ? config[label]?.label || label
        : itemConfig?.label;

    if (labelFormatter) {
      return (
        <div className={cn("font-medium", labelClassName)}>
          {labelFormatter(value, payload)}
        </div>
      );
    }

    if (!value) {
      return null;
    }

    return <div className={cn("font-medium", labelClassName)}>{value}</div>;
  })();

  if (!active || !payload?.length) {
    return null;
  }

  const nestLabel = payload.length === 1 && indicator !== "dot";

  return (
    <div
      className={cn(
        "border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl",
        className,
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {payload.reduce<React.ReactNode[]>((items, item) => {
          if (item.type === "none") return items;
          const index = items.length;
          const key = resolveTooltipItemKey(nameKey, item);
          const itemConfig = getPayloadConfigFromPayload(config, item, key);
          const indicatorColor = resolveIndicatorColor(color, item);
          const indicatorStyle: CSSPropertiesWithVariables = {
            "--color-bg": indicatorColor,
            "--color-border": indicatorColor,
          };

          items.push(
            <div
              key={item.dataKey}
              className={cn(
                "[&>svg]:text-muted-foreground flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5",
                indicator === "dot" && "items-center",
              )}
            >
              {formatter && item.value !== undefined && item.name ? (
                formatter(
                  item.value,
                  item.name,
                  item,
                  index,
                  item.payload ?? {},
                )
              ) : (
                <>
                  {itemConfig?.icon ? (
                    <itemConfig.icon />
                  ) : (
                    !hideIndicator && (
                      <div
                        className={cn(
                          "shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)",
                          {
                            "h-2.5 w-2.5": indicator === "dot",
                            "w-1": indicator === "line",
                            "w-0 border-[1.5px] border-dashed bg-transparent":
                              indicator === "dashed",
                            "my-0.5": nestLabel && indicator === "dashed",
                          },
                        )}
                        style={indicatorStyle}
                      />
                    )
                  )}
                  <div
                    className={cn(
                      "flex flex-1 justify-between leading-none",
                      nestLabel ? "items-end" : "items-center",
                    )}
                  >
                    <div className="grid gap-1.5">
                      {nestLabel ? tooltipLabel : null}
                      <span className="text-muted-foreground">
                        {itemConfig?.label || item.name}
                      </span>
                    </div>
                    {item.value && (
                      <span className="text-foreground font-mono font-medium tabular-nums">
                        {item.value.toLocaleString()}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>,
          );
          return items;
        }, [])}
      </div>
    </div>
  );
}

const ChartLegend = RechartsPrimitive.Legend;

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
}: React.ComponentProps<"div"> & {
  payload?: ChartPayloadItem[];
  verticalAlign?: "top" | "bottom";
  hideIcon?: boolean;
  nameKey?: string;
}) {
  const config = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className,
      )}
    >
      {payload.map((item) => {
        if (item.type === "none") return null;
        const key = `${nameKey || item.dataKey || "value"}`;
        const itemConfig = getPayloadConfigFromPayload(config, item, key);

        return (
          <div
            key={item.value}
            className={cn(
              "[&>svg]:text-muted-foreground flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3",
            )}
          >
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <div
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{
                  backgroundColor: item.color,
                }}
              />
            )}
            {itemConfig?.label}
          </div>
        );
      })}
    </div>
  );
}

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string,
) {
  if (!isObjectRecord(payload)) return undefined;
  const nestedPayload = isObjectRecord(payload.payload)
    ? payload.payload
    : undefined;
  const directKey = payload[key];
  const nestedKey = nestedPayload?.[key];
  let configLabelKey = key;
  if (typeof directKey === "string") configLabelKey = directKey;
  else if (typeof nestedKey === "string") configLabelKey = nestedKey;
  return configLabelKey in config ? config[configLabelKey] : config[key];
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
};
