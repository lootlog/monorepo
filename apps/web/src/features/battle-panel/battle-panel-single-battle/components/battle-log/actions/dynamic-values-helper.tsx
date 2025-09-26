import { ReactNode } from "react";

/**
 * Generates dynamic values object from comma-separated string
 * @param value - Comma-separated string like "123,456,789"
 * @param prefix - Prefix for keys (default: "v")
 * @returns Object like { v0: "123", v1: "456", v2: "789" }
 */
export const generateDynamicValues = (
  value: string,
  prefix: string = "v"
): Record<string, string> => {
  const values = value.split(",");
  const dynamicValues: Record<string, string> = {};

  values.forEach((val, index) => {
    dynamicValues[`${prefix}${index}`] = val.trim();
  });

  return dynamicValues;
};

/**
 * Generates dynamic components object for Trans component
 * @param value - Comma-separated string to determine count
 * @param prefix - Prefix for component keys (default: "v")
 * @param component - Component to use for each value
 * @returns Object like { v0: <Component />, v1: <Component />, v2: <Component /> }
 */
export const generateDynamicComponents = (
  value: string,
  prefix: string = "v",
  component: ReactNode = <span className="font-semibold" />
): Record<string, ReactNode> => {
  const values = value.split(",");
  const dynamicComponents: Record<string, ReactNode> = {};

  values.forEach((_, index) => {
    dynamicComponents[`${prefix}${index}`] = component;
  });

  return dynamicComponents;
};

/**
 * Generates both values and components in one call
 * @param value - Comma-separated string
 * @param prefix - Prefix for keys (default: "v")
 * @param component - Component to use for each value
 * @returns Object with values and components properties
 */
export const generateDynamicValuesAndComponents = (
  value: string,
  prefix: string = "v",
  component: ReactNode = <span className="font-semibold" />
) => ({
  values: generateDynamicValues(value, prefix),
  components: generateDynamicComponents(value, prefix, component)
});

/**
 * Type for dynamic values configuration
 */
export type DynamicValuesConfig = {
  prefix?: string;
  component?: ReactNode;
  customComponents?: Record<string, ReactNode>;
};