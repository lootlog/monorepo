import { access } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const artifactFiles = [
  "cloudflare-artifact.tar.gz",
  "cloudflare-artifact.tar.gz.sha256",
];

async function containsArtifactFiles(directory) {
  try {
    await Promise.all(
      artifactFiles.map((artifactFile) =>
        access(path.join(directory, artifactFile)),
      ),
    );
    return true;
  } catch {
    return false;
  }
}

export async function resolveCloudflareArtifactDirectory(
  downloadRoot,
  artifactName,
) {
  const namedDirectory = path.join(downloadRoot, artifactName);
  const [hasDirectArtifact, hasNamedArtifact] = await Promise.all([
    containsArtifactFiles(downloadRoot),
    containsArtifactFiles(namedDirectory),
  ]);

  if (hasDirectArtifact && hasNamedArtifact) {
    throw new Error(
      `Cloudflare artifact layout is ambiguous for ${artifactName}`,
    );
  }

  if (hasNamedArtifact) {
    return namedDirectory;
  }

  if (hasDirectArtifact) {
    return downloadRoot;
  }

  throw new Error(
    `Cloudflare artifact files were not found for ${artifactName}`,
  );
}

const isCommandLineInvocation =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCommandLineInvocation) {
  const [downloadRoot, artifactName] = process.argv.slice(2);

  if (!downloadRoot || !artifactName) {
    throw new Error(
      "Usage: resolve-cloudflare-artifact-directory.mjs <download-root> <artifact-name>",
    );
  }

  process.stdout.write(
    await resolveCloudflareArtifactDirectory(downloadRoot, artifactName),
  );
}
