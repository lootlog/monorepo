import assert from "node:assert/strict";

const artifactBaseUrl = new URL("https://static-artifact.invalid");

export function verifyGeneratedAssetReferences(
  document,
  namespace,
  documentName,
) {
  const references = Array.from(
    document.matchAll(/(?:href|src)="([^"]+\.(?:css|js)(?:[?#][^"]*)?)"/gu),
    ([, reference]) => reference,
  ).filter(
    (reference) =>
      new URL(reference, artifactBaseUrl).origin === artifactBaseUrl.origin,
  );
  assert.ok(
    references.length > 0,
    `${documentName} does not reference generated CSS or JavaScript`,
  );
  for (const reference of references) {
    assert.ok(
      reference.startsWith(`/${namespace}-assets/`),
      `${documentName} references a generated asset outside the ${namespace} namespace: ${reference}`,
    );
  }
}
