const BUNDLE_PATH = new URL(
  "../../dist/@lootlog/game-client.user.js",
  import.meta.url,
);

const bundle = await Bun.file(BUNDLE_PATH).bytes();

const gzipBytes = Bun.gzipSync(bundle).byteLength;

const kib = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`;

process.stdout.write(
  `game-client bundle: ${kib(gzipBytes)} gzip (${kib(bundle.byteLength)} minified)\n`,
);
