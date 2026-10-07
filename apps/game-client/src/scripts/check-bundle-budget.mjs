// Fails the build when the userscript bundle outgrows its budget. Every
// player downloads, parses and compiles the whole bundle while Margonem itself
// is loading, so its size is a direct cost to the game's startup.
const BUNDLE_PATH = new URL(
  "../../dist/@lootlog/game-client.user.js",
  import.meta.url,
);

// Gzipped bytes. Raise it deliberately, in the change that needs the room.
const GZIP_BUDGET_BYTES = 800_000;

const bundle = await Bun.file(BUNDLE_PATH).bytes();

const gzipBytes = Bun.gzipSync(bundle).byteLength;

const kib = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`;

const summary = `game-client bundle: ${kib(gzipBytes)} gzip of ${kib(GZIP_BUDGET_BYTES)} budget (${kib(bundle.byteLength)} minified)`;

if (gzipBytes > GZIP_BUDGET_BYTES) {
  process.stderr.write(`${summary}\nThe bundle exceeds its size budget.\n`);
  process.exit(1);
}

process.stdout.write(`${summary}\n`);
