import type { ReactNode } from "react";
import { roundValue } from "./value-utils";

const generateDynamicValues = (
  value: string,
  prefix: string = "v",
): Record<string, string> => {
  const values = value.split(",");
  const dynamicValues: Record<string, string> = {};

  values.forEach((val, index) => {
    dynamicValues[`${prefix}${index}`] = roundValue(val.trim());
  });

  return dynamicValues;
};

const generateDynamicComponents = (
  value: string,
  prefix: string = "v",
  component: ReactNode = <span className="font-semibold" />,
): Record<string, ReactNode> => {
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
  values: generateDynamicValues(value, prefix),
  components: generateDynamicComponents(value, prefix, component),
});

export type DynamicValuesConfig = {
  prefix?: string;
  component?: ReactNode;
  customComponents?: Record<string, ReactNode>;
};
