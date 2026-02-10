import { BadRequestException } from '@nestjs/common';
import ts from 'typescript';

export type ExtractedAddonMetadata = {
  id: string;
  name: string;
  description?: string;
  version?: string;
};

const unwrapExpression = (expression: ts.Expression): ts.Expression => {
  let current = expression;

  while (true) {
    if (ts.isParenthesizedExpression(current)) {
      current = current.expression;
      continue;
    }

    if (ts.isAsExpression(current) || ts.isTypeAssertionExpression(current)) {
      current = current.expression;
      continue;
    }

    if (
      'isSatisfiesExpression' in ts &&
      typeof ts.isSatisfiesExpression === 'function' &&
      ts.isSatisfiesExpression(current)
    ) {
      current = current.expression;
      continue;
    }

    return current;
  }
};

const isDefineAddonCall = (expression: ts.LeftHandSideExpression): boolean => {
  if (ts.isIdentifier(expression)) {
    return expression.text === 'defineAddon';
  }

  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text === 'defineAddon';
  }

  return false;
};

const getObjectLiteralArgument = (
  callExpression: ts.CallExpression,
): ts.ObjectLiteralExpression | null => {
  const firstArg = callExpression.arguments[0];
  if (!firstArg) {
    return null;
  }

  const unwrappedArg = unwrapExpression(firstArg);
  return ts.isObjectLiteralExpression(unwrappedArg) ? unwrappedArg : null;
};

const getPropertyName = (node: ts.ObjectLiteralElementLike): string | null => {
  if (!('name' in node) || !node.name) {
    return null;
  }

  const { name } = node;

  if (ts.isIdentifier(name)) {
    return name.text;
  }

  if (
    ts.isStringLiteral(name) ||
    ts.isNumericLiteral(name) ||
    ts.isNoSubstitutionTemplateLiteral(name)
  ) {
    return name.text;
  }

  return null;
};

const readStringProperty = (
  objectLiteral: ts.ObjectLiteralExpression,
  propertyName: string,
  { required }: { required: boolean },
): string | undefined => {
  const property = objectLiteral.properties.find(
    (node) => getPropertyName(node) === propertyName,
  );

  if (!property) {
    if (required) {
      throw new BadRequestException(
        `Addon metadata is missing required "${propertyName}" string field in defineAddon({...})`,
      );
    }
    return undefined;
  }

  if (!ts.isPropertyAssignment(property)) {
    throw new BadRequestException(
      `Addon metadata field "${propertyName}" must be a string literal`,
    );
  }

  const initializer = unwrapExpression(property.initializer);
  if (
    ts.isStringLiteral(initializer) ||
    ts.isNoSubstitutionTemplateLiteral(initializer)
  ) {
    return initializer.text;
  }

  throw new BadRequestException(
    `Addon metadata field "${propertyName}" must be a string literal`,
  );
};

const findDefineAddonConfig = (
  sourceFile: ts.SourceFile,
): ts.ObjectLiteralExpression => {
  let foundDefineAddonCall = false;
  let config: ts.ObjectLiteralExpression | null = null;

  const visit = (node: ts.Node): void => {
    if (config) {
      return;
    }

    if (ts.isCallExpression(node) && isDefineAddonCall(node.expression)) {
      foundDefineAddonCall = true;
      const objectLiteral = getObjectLiteralArgument(node);

      if (objectLiteral) {
        config = objectLiteral;
        return;
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  if (config) {
    return config;
  }

  if (foundDefineAddonCall) {
    throw new BadRequestException(
      'defineAddon(...) must receive an inline object literal with metadata fields',
    );
  }

  throw new BadRequestException(
    'Addon source must include defineAddon({...}) to declare metadata',
  );
};

export const extractAddonMetadataFromSource = (
  sourceCode: string,
): ExtractedAddonMetadata => {
  const sourceFile = ts.createSourceFile(
    'addon.tsx',
    sourceCode,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const addonConfig = findDefineAddonConfig(sourceFile);

  return {
    id: readStringProperty(addonConfig, 'id', { required: true })!,
    name: readStringProperty(addonConfig, 'name', { required: true })!,
    description: readStringProperty(addonConfig, 'description', {
      required: false,
    }),
    version: readStringProperty(addonConfig, 'version', { required: false }),
  };
};
