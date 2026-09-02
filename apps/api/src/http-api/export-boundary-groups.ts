const BOUNDARY_GROUPS = ["HealthGroup", "UserLootlogConfigGroup"] as const;

/** Exposes the generated groups used by the native HTTP acceptance harness. */
export const exportBoundaryGroups = (source: string): string => {
  let output = source;

  for (const group of BOUNDARY_GROUPS) {
    const declaration = `class ${group} extends`;
    const exportedDeclaration = `export class ${group} extends`;
    const exportedCount = output.split(exportedDeclaration).length - 1;
    const declarationCount =
      output.split(declaration).length - 1 - exportedCount;

    if (declarationCount + exportedCount !== 1) {
      throw new Error(
        `boundary group export: expected one ${group} declaration, found ${declarationCount + exportedCount}`,
      );
    }

    if (exportedCount === 0) {
      output = output.replace(declaration, exportedDeclaration);
    }
  }

  return output;
};
