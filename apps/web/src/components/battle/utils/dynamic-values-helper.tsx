import type { ReactNode } from "react";
import { getDynamicBattleValues } from "./battle-action-values";

const generateDynamicComponents = (
  value: string,
  prefix: string = "v",
  component: ReactNode = <span className="font-semibold" />,
) => {
  const values = value.split(",");
  const dynamicComponents: Record<string, ReactNode> = {};

  values.forEach((_, index) => {
    dynamicComponents[`${prefix}${index}`] = component;
  });

  return dynamicComponents;
};

export const generateDynamicValuesAndComponents = (
  value: string,
  prefix: string = "v",
  component: ReactNode = <span className="font-semibold" />,
) => ({
  values: getDynamicBattleValues(value, prefix),
  components: generateDynamicComponents(value, prefix, component),
});

export type DynamicValuesConfig = {
  prefix?: string;
  component?: ReactNode;
  customComponents?: Record<string, ReactNode>;
};
